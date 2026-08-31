/**
 * Tencent Cloud SCF entry point.
 *
 * Deploy as a Web Function (HTTP trigger) and set the handler to
 * `src/adapters/tencent.handler`.
 */
export { tencentHandler as handler } from "../index";
