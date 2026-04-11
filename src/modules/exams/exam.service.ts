import { ApiError } from "../../utils/api-error";
import { QuestionBankQuestionModel } from "../questions/question-bank.model";
import { ExamQuestionModel } from "./exam-question.model";
import { ExamModel } from "./exam.model";
import {
  assertExamWindow,
  assertQuestionOptions,
  buildPromptKey,
  ensureExamForAdmin,
  ensureExamForAdminLean,
  getNextQuestionOrder,
  mapExam,
  mapExamQuestion,
} from "./exam.service.helpers";
import type {
  AddQuestionFromBankInput,
  AddExamQuestionInput,
  CreateExamBasicInfoInput,
  ListExamQueryInput,
  UpdateExamBasicInfoInput,
  UpdateExamStatusInput,
  UpdateExamQuestionInput,
} from "./exam.validation";

export class ExamService {
  async createBasicInfo(payload: CreateExamBasicInfoInput, adminUserId: string) {
    const start = new Date(payload.startTime);
    const end = new Date(payload.endTime);
    assertExamWindow(start, end);

    const exam = await ExamModel.create({
      ...payload,
      startTime: start,
      endTime: end,
      status: "PUBLISHED",
      createdBy: adminUserId,
    });

    return mapExam(exam.toObject());
  }

  async listExams(query: ListExamQueryInput, adminUserId: string) {
    const searchValue = String(query.search ?? "").trim();
    const page = Number.isInteger(query.page) && query.page > 0 ? query.page : 1;
    const limit =
      Number.isInteger(query.limit) && query.limit > 0 && query.limit <= 100 ? query.limit : 8;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { createdBy: adminUserId };
    if (searchValue) {
      filter.title = { $regex: searchValue, $options: "i" };
    }

    const [items, total] = await Promise.all([
      ExamModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select({
          title: 1,
          totalCandidates: 1,
          totalSlots: 1,
          totalQuestionSet: 1,
          questionType: 1,
          startTime: 1,
          endTime: 1,
          durationMinutes: 1,
          attemptLimit: 1,
          immediateResultPublish: 1,
          maxViolationLimit: 1,
          passThreshold: 1,
          status: 1,
          createdAt: 1,
        })
        .lean(),
      ExamModel.countDocuments(filter),
    ]);

    return {
      items: items.map((exam) => mapExam(exam)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getExamById(examId: string, adminUserId: string) {
    const exam = await ensureExamForAdminLean(examId, adminUserId);
    return mapExam(exam);
  }

  async updateExamBasicInfo(payload: UpdateExamBasicInfoInput, examId: string, adminUserId: string) {
    const exam = await ensureExamForAdmin(examId, adminUserId);

    if (exam.status !== "DRAFT") {
      throw new ApiError(409, "Only draft exams can be edited");
    }

    const nextStart = payload.startTime ? new Date(payload.startTime) : exam.startTime;
    const nextEnd = payload.endTime ? new Date(payload.endTime) : exam.endTime;
    assertExamWindow(nextStart, nextEnd);

    if (payload.title !== undefined) exam.title = payload.title;
    if (payload.totalCandidates !== undefined) exam.totalCandidates = payload.totalCandidates;
    if (payload.totalSlots !== undefined) exam.totalSlots = payload.totalSlots;
    if (payload.totalQuestionSet !== undefined) exam.totalQuestionSet = payload.totalQuestionSet;
    if (payload.questionType !== undefined) exam.questionType = payload.questionType;
    if (payload.startTime !== undefined) exam.startTime = nextStart;
    if (payload.endTime !== undefined) exam.endTime = nextEnd;
    if (payload.durationMinutes !== undefined) exam.durationMinutes = payload.durationMinutes;
    if (payload.attemptLimit !== undefined) exam.attemptLimit = payload.attemptLimit;
    if (payload.immediateResultPublish !== undefined) {
      exam.immediateResultPublish = payload.immediateResultPublish;
    }
    if (payload.maxViolationLimit !== undefined) exam.maxViolationLimit = payload.maxViolationLimit;
    if (payload.passThreshold !== undefined) exam.passThreshold = payload.passThreshold;

    await exam.save();
    return mapExam(exam.toObject());
  }

  async updateExamStatus(payload: UpdateExamStatusInput, examId: string, adminUserId: string) {
    const exam = await ensureExamForAdmin(examId, adminUserId);

    if (exam.status === "EXPIRED") {
      throw new ApiError(409, "Expired exam status cannot be changed");
    }
    if (payload.status === "DRAFT" && exam.status !== "DRAFT") {
      throw new ApiError(409, "Published exam cannot be moved back to draft");
    }

    exam.status = payload.status;
    await exam.save();
    return mapExam(exam.toObject());
  }

  async deleteExam(examId: string, adminUserId: string) {
    const exam = await ensureExamForAdminLean(examId, adminUserId);

    await Promise.all([
      ExamQuestionModel.deleteMany({ examId }),
      ExamModel.deleteOne({ _id: examId, createdBy: adminUserId }),
    ]);

    return { id: String(exam._id) };
  }

  async addQuestion(payload: AddExamQuestionInput, examId: string, adminUserId: string) {
    const exam = await ensureExamForAdminLean(examId, adminUserId);

    const promptKey = buildPromptKey(payload.prompt);
    const repeatedInExam = await ExamQuestionModel.exists({ examId, type: payload.type, promptKey });
    if (repeatedInExam) {
      throw new ApiError(409, "Same question is already added to this exam");
    }

    const nextOrder = await getNextQuestionOrder(examId);

    const bankQuestion = await QuestionBankQuestionModel.create({
      bankName: exam.title,
      prompt: payload.prompt,
      promptKey,
      type: payload.type,
      marks: payload.marks,
      negativeMarks: payload.negativeMarks ?? 0,
      options: payload.options,
      createdBy: adminUserId,
    });

    const question = await ExamQuestionModel.create({
      examId,
      sourceType: "QUESTION_BANK",
      bankQuestionId: bankQuestion._id,
      prompt: payload.prompt,
      promptKey,
      type: payload.type,
      marks: payload.marks,
      negativeMarks: payload.negativeMarks ?? 0,
      options: payload.options,
      order: nextOrder,
      createdBy: adminUserId,
    });

    return mapExamQuestion(question.toObject());
  }

  async addQuestionFromBank(payload: AddQuestionFromBankInput, examId: string, adminUserId: string) {
    await ensureExamForAdminLean(examId, adminUserId);

    const bankQuestion = await QuestionBankQuestionModel.findOne({
      _id: payload.bankQuestionId,
      createdBy: adminUserId,
    }).lean();
    if (!bankQuestion) {
      throw new ApiError(404, "Bank question not found");
    }

    const repeatedByBankRef = await ExamQuestionModel.exists({ examId, bankQuestionId: bankQuestion._id });
    if (repeatedByBankRef) {
      throw new ApiError(409, "This bank question is already added to this exam");
    }

    const promptKey = buildPromptKey(bankQuestion.prompt);
    const repeatedByPrompt = await ExamQuestionModel.exists({
      examId,
      type: bankQuestion.type,
      promptKey,
    });
    if (repeatedByPrompt) {
      throw new ApiError(409, "Same question is already added to this exam");
    }

    const question = await ExamQuestionModel.create({
      examId,
      sourceType: "QUESTION_BANK",
      bankQuestionId: bankQuestion._id,
      prompt: bankQuestion.prompt,
      promptKey,
      type: bankQuestion.type,
      marks: bankQuestion.marks,
      negativeMarks: bankQuestion.negativeMarks,
      options: bankQuestion.options,
      order: await getNextQuestionOrder(examId),
      createdBy: adminUserId,
    });

    return mapExamQuestion(question.toObject());
  }

  async listQuestions(examId: string, adminUserId: string) {
    await ensureExamForAdminLean(examId, adminUserId);

    const items = await ExamQuestionModel.find({ examId }).sort({ order: 1 }).lean();
    return items.map((question) => ({
      id: String(question._id),
      examId: String(question.examId),
      prompt: question.prompt,
      type: question.type,
      marks: question.marks,
      negativeMarks: question.negativeMarks,
      options: question.options,
      order: question.order,
      createdAt: question.createdAt,
    }));
  }

  async getQuestionById(examId: string, questionId: string, adminUserId: string) {
    await ensureExamForAdminLean(examId, adminUserId);

    const question = await ExamQuestionModel.findOne({ _id: questionId, examId }).lean();
    if (!question) {
      throw new ApiError(404, "Question not found");
    }

    return {
      id: String(question._id),
      examId: String(question.examId),
      prompt: question.prompt,
      type: question.type,
      marks: question.marks,
      negativeMarks: question.negativeMarks,
      options: question.options,
      order: question.order,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
  }

  async updateQuestion(
    payload: UpdateExamQuestionInput,
    examId: string,
    questionId: string,
    adminUserId: string,
  ) {
    await ensureExamForAdminLean(examId, adminUserId);

    const question = await ExamQuestionModel.findOne({ _id: questionId, examId });
    if (!question) {
      throw new ApiError(404, "Question not found");
    }

    const nextType = payload.type ?? question.type;
    const nextOptions = payload.options ?? question.options;
    const nextPrompt = payload.prompt ?? question.prompt;
    const nextPromptKey = buildPromptKey(nextPrompt);

    assertQuestionOptions(nextType, nextOptions);

    const duplicateInExam = await ExamQuestionModel.exists({
      _id: { $ne: question._id },
      examId,
      type: nextType,
      promptKey: nextPromptKey,
    });
    if (duplicateInExam) {
      throw new ApiError(409, "Same question is already added to this exam");
    }

    if (payload.prompt !== undefined) question.prompt = payload.prompt;
    question.promptKey = nextPromptKey;
    if (payload.type !== undefined) question.type = payload.type;
    if (payload.marks !== undefined) question.marks = payload.marks;
    if (payload.negativeMarks !== undefined) question.negativeMarks = payload.negativeMarks;
    if (payload.options !== undefined) {
      question.set("options", payload.options);
    }

    await question.save();

    if (question.bankQuestionId) {
      await QuestionBankQuestionModel.updateOne(
        { _id: question.bankQuestionId, createdBy: adminUserId },
        {
          $set: {
            prompt: question.prompt,
            promptKey: question.promptKey,
            type: question.type,
            marks: question.marks,
            negativeMarks: question.negativeMarks,
            options: question.options,
          },
        },
      );
    }

    return {
      ...mapExamQuestion(question.toObject()),
      updatedAt: question.updatedAt,
    };
  }

  async deleteQuestion(examId: string, questionId: string, adminUserId: string) {
    await ensureExamForAdminLean(examId, adminUserId);

    const question = await ExamQuestionModel.findOneAndDelete({ _id: questionId, examId });
    if (!question) {
      throw new ApiError(404, "Question not found");
    }

    return { id: String(question._id) };
  }
}

export const examService = new ExamService();
