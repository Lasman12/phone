// Tony רץ כאן, ב-Worker נפרד, כדי שהטלפון לא ייתקע בזמן שהוא חושב
import { WebWorkerMLCEngineHandler } from 'https://esm.run/@mlc-ai/web-llm@0.2.85';

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = msg => handler.onmessage(msg);
