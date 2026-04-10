import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorMiddleware } from "../middlewares/error.middleware";
import { notFoundMiddleware } from "../middlewares/not-found.middleware";
import { router } from "../routes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", router);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
