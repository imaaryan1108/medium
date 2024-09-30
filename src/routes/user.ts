import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { decode, sign, verify } from "hono/jwt";

export const userRouter = new Hono<{
    Bindings:{
        DATABASE_URL: string;
        JWT_SECRET: string;
    }
}>()
userRouter.post("/signup", async (c) => {
  const prisma = new PrismaClient({
    datasources: { db: { url: c.env.DATABASE_URL } },
    log: ["query", "info", "warn", "error"], // Enable logging
  }).$extends(withAccelerate());

  const body = await c.req.json();

  try {
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: body.password,
      },
    });

    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);

    return c.json(jwt);
  } catch (e) {
    c.status(403);
    return c.json({ message: e });
  }
});

userRouter.post("/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();

  const email = body?.email;
  const password = body?.password;

  try {
    const user = await prisma.user.findFirst({
      where: { email: email, password: password },
    });
    if (!user) {
      c.status(403);
      return c.json({ error: "user not found" });
    }
    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.json({ jwt });
  } catch (e) {
    c.status(400);
    return c.json({ message: "Error" });
  }
});