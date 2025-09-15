import { NextResponse } from "next/server";
import { readUsers, writeUsers, User } from "@/lib/usersStore";

export async function POST(req: Request) {
  try {
    console.log("cwd", process.cwd());
    
    const body: User = await req.json();
    console.log("body", body);
    const users = await readUsers();
    console.log("users", users);
    
    users.push(body);
    console.log("users", users);
    await writeUsers(users);
    return NextResponse.json({ message: "User created", users });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Помилка створення користувача", error: err.message },
      { status: 500 }
    );
  }
}
