import { ApiError } from "../../utils/api-error";
import { QuestionBankQuestionModel } from "./question-bank.model";
import type {
  CreateQuestionInput,
  ListQuestionQueryInput,
  UpdateQuestionInput,
} from "./question-bank.validation";

export class QuestionBankService {
  async create(payload: CreateQuestionInput, adminUserId: string) {
    const question = await QuestionBankQuestionModel.create({
      bankName: payload.bankName,
      prompt: payload.prompt,
      type: payload.type,
      marks: payload.marks,
      negativeMarks: payload.negativeMarks ?? 0,
      options: payload.options,
      createdBy: adminUserId,
    });

    return {
      id: String(question._id),
      bankName: question.bankName,
      prompt: question.prompt,
      type: question.type,
      marks: question.marks,
      negativeMarks: question.negativeMarks,
      options: question.options,
      createdAt: question.createdAt,
    };
  }

  async list(query: ListQuestionQueryInput, adminUserId: string) {
    const search = String(query.search ?? "").trim();
    const bankName = String(query.bankName ?? "").trim();
    const page = Number.isInteger(query.page) && query.page > 0 ? query.page : 1;
    const limit = Number.isInteger(query.limit) && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { createdBy: adminUserId };
    if (search) {
      filter.prompt = { $regex: search, $options: "i" };
    }
    if (bankName) {
      filter.bankName = bankName;
    }

    const [items, total] = await Promise.all([
      QuestionBankQuestionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      QuestionBankQuestionModel.countDocuments(filter),
    ]);

    return {
      items: items.map((question) => ({
        id: String(question._id),
        bankName: question.bankName,
        prompt: question.prompt,
        type: question.type,
        marks: question.marks,
        negativeMarks: question.negativeMarks,
        options: question.options,
        createdAt: question.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getById(questionId: string, adminUserId: string) {
    const question = await QuestionBankQuestionModel.findOne({
      _id: questionId,
      createdBy: adminUserId,
    }).lean();

    if (!question) {
      throw new ApiError(404, "Question not found");
    }

    return {
      id: String(question._id),
      bankName: question.bankName,
      prompt: question.prompt,
      type: question.type,
      marks: question.marks,
      negativeMarks: question.negativeMarks,
      options: question.options,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
  }

  async update(payload: UpdateQuestionInput, questionId: string, adminUserId: string) {
    const question = await QuestionBankQuestionModel.findOne({
      _id: questionId,
      createdBy: adminUserId,
    });

    if (!question) {
      throw new ApiError(404, "Question not found");
    }

    const nextType = payload.type ?? question.type;
    const nextOptions = payload.options ?? question.options;

    if (nextType === "TEXT" && nextOptions.length > 0) {
      throw new ApiError(400, "TEXT question cannot have options");
    }

    if ((nextType === "RADIO" || nextType === "CHECKBOX") && nextOptions.length < 2) {
      throw new ApiError(400, "At least 2 options are required");
    }

    if (nextType === "RADIO") {
      const correctCount = nextOptions.filter((option) => option.isCorrect).length;
      if (correctCount !== 1) {
        throw new ApiError(400, "RADIO question must have exactly one correct option");
      }
    }

    if (nextType === "CHECKBOX") {
      const correctCount = nextOptions.filter((option) => option.isCorrect).length;
      if (correctCount < 1) {
        throw new ApiError(400, "CHECKBOX question must have at least one correct option");
      }
    }

    if (payload.bankName !== undefined) question.bankName = payload.bankName;
    if (payload.prompt !== undefined) question.prompt = payload.prompt;
    if (payload.type !== undefined) question.type = payload.type;
    if (payload.marks !== undefined) question.marks = payload.marks;
    if (payload.negativeMarks !== undefined) question.negativeMarks = payload.negativeMarks;
    if (payload.options !== undefined) question.set("options", payload.options);

    await question.save();

    return {
      id: String(question._id),
      bankName: question.bankName,
      prompt: question.prompt,
      type: question.type,
      marks: question.marks,
      negativeMarks: question.negativeMarks,
      options: question.options,
      updatedAt: question.updatedAt,
    };
  }

  async delete(questionId: string, adminUserId: string) {
    const question = await QuestionBankQuestionModel.findOneAndDelete({
      _id: questionId,
      createdBy: adminUserId,
    });

    if (!question) {
      throw new ApiError(404, "Question not found");
    }

    return { id: String(question._id) };
  }
}

export const questionBankService = new QuestionBankService();
