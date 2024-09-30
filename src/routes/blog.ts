import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { decode, sign, verify } from "hono/jwt";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

blogRouter.use("/*", async (c, next) => {
  const authHeader = c?.req?.header("authorization") || "";
  const token = authHeader.split(" ")[1];
  try {
    const response = await verify(token, c.env.JWT_SECRET);
    if (response.id) {
      console.log("response--------------------", response);
      c.set("userId", response.id as string);
      await next();
    }
  } catch (e) {
    c.status(403);
    return c.json({ message: "Not authorized" });
  }
});

blogRouter.post("/", async (c) => {
  const prisma = new PrismaClient({
    datasources: { db: { url: c.env.DATABASE_URL } },
    log: ["query", "info", "warn", "error"], // Enable logging
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const title: string = body?.title || "";
  const content: string = body?.content || "";
  const author: string = body?.author || "";

  const userId = c.get("userId");

  const response = await prisma.post.create({
    data: {
      content: content,
      title: title,
      authorId: userId,
    },
  });

  return c.json({
    id: response.id,
  });
});

blogRouter.put("/", async (c) => {
  const prisma = new PrismaClient({
    datasources: { db: { url: c.env.DATABASE_URL } },
    log: ["query", "info", "warn", "error"], // Enable logging
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const title: string = body?.title || "";
  const content: string = body?.content || "";

  const response = await prisma.post.update({
    where: {
      id: body?.id,
    },
    data: {
      content: content,
      title: title,
    },
  });

  return c.json({
    blog: response,
  });
});

blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasources: { db: { url: c.env.DATABASE_URL } },
    log: ["query", "info", "warn", "error"], // Enable logging
  }).$extends(withAccelerate());

  try {
    const response = await prisma.post.findMany();

    return c.json({
      blog: response,
    });
  } catch (e) {
    c.status(400);
    return c.json({ error: e });
  }
});

blogRouter.get("/:id", async (c) => {
  const prisma = new PrismaClient({
    datasources: { db: { url: c.env.DATABASE_URL } },
    log: ["query", "info", "warn", "error"], // Enable logging
  }).$extends(withAccelerate());

  const _id = await c.req.param("id");

  try {
    const response = await prisma.post.findFirst({
      where: {
        id: _id,
      },
    });

    if (response) {
      return c.json({
        blog: response,
      });
    }
  } catch (e) {
    c.status(400);
    return c.json({ error: e });
  }
});
