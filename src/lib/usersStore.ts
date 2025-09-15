import fs from "fs/promises";
import path from "path";

const filePath = path.join(process.cwd(), "data", "users.json");

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface User {
  email: string;
  password: string;
  history?: Message[]; // додаємо необов'язкове поле для історії
}

export async function readUsers(): Promise<User[]> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    // якщо файл не існує — створюємо порожній масив
    await fs.writeFile(filePath, "[]");
    return [];
  }
}

export async function writeUsers(users: User[]) {
  await fs.writeFile(filePath, JSON.stringify(users, null, 2));
}
