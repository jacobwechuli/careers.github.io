import "dotenv/config";
import app from "./app.js";
const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
    console.log(`Career Agent API running on http://localhost:${PORT}`);
});
