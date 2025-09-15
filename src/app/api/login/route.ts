import { NextResponse } from "next/server";
import { readUsers } from "@/lib/usersStore";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const users = await readUsers();

  const found = users.find(u => u.email === email && u.password === password);
    console.log("found", found);
    
  if (!found) {
    return NextResponse.json({ message: "Невірний email або пароль" }, { status: 401 });
  }

  return NextResponse.json({ message: "Успішний вхід", user: found });
}
