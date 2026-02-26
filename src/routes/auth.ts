import { FastifyPluginAsync } from "fastify"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import db from "../utils/database"
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from "../schemas/auth"

interface RegisterBody {
  username: string
  password: string
}

interface LoginBody {
  username: string
  password: string
}

interface RefreshBody {
  refreshToken: string
}

interface JwtPayload {
  id: number
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  /*
  =====================================================
  REGISTER
  =====================================================
  */
  fastify.post<{ Body: RegisterBody }>(
    "/register",
    {
      schema: registerSchema
    },
    async (request, reply) => {
      const { username, password } = request.body

      const existingUser = await db("users")
        .where("username", username)
        .first()

      if (existingUser) {
        return reply.code(400).send({ error: "Username already exists" })
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      const [userId] = await db("users").insert({
        username,
        password: hashedPassword
      })

      return reply.code(201).send({
        message: "User registered successfully",
        userId
      })
    }
  )

  /*
  =====================================================
  LOGIN
  =====================================================
  */
  fastify.post<{ Body: LoginBody }>(
    "/login",
    {
      schema: loginSchema
    },
    async (request, reply) => {
      const { username, password } = request.body

      const user = await db("users")
        .where("username", username)
        .first()

      if (!user) {
        return reply.code(401).send({ error: "Invalid credentials" })
      }

      const isValidPassword = await bcrypt.compare(
        password,
        user.password
      )

      if (!isValidPassword) {
        return reply.code(401).send({ error: "Invalid credentials" })
      }

      const accessToken = fastify.jwt.sign(
        { id: user.id, username: user.username },
        { expiresIn: "15m" }
      )

      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.REFRESH_SECRET as string,
        { expiresIn: "7d" }
      )

      await db("users")
        .where("id", user.id)
        .update({ refresh_token: refreshToken })

      return { accessToken, refreshToken }
    }
  )

  /*
  =====================================================
  REFRESH
  =====================================================
  */
  fastify.post<{ Body: RefreshBody }>(
    "/refresh",
    {
      schema: refreshSchema
    },
    async (request, reply) => {
      const { refreshToken } = request.body

      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_SECRET as string
        ) as JwtPayload

        const user = await db("users")
          .where("id", decoded.id)
          .first()

        if (!user || user.refresh_token !== refreshToken) {
          throw new Error("Invalid refresh token")
        }

        const newAccessToken = fastify.jwt.sign(
          { id: user.id, username: user.username },
          { expiresIn: "15m" }
        )

        return { accessToken: newAccessToken }
      } catch {
        return reply.code(401).send({ error: "Invalid refresh token" })
      }
    }
  )

  /*
  =====================================================
  LOGOUT
  =====================================================
  */
  fastify.post(
    "/logout",
    {
      preHandler: [fastify.authenticate],
      schema: logoutSchema
    },
    async (request, reply) => {
      const user = request.user as { id: number }

      await db("users")
        .where("id", user.id)
        .update({ refresh_token: null })

      return { message: "Logged out successfully" }
    }
  )
}

export default authRoutes