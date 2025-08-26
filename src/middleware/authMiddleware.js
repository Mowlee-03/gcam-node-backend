const { verifyToken } = require("../utils/token");
const {PrismaClient}=require("../generated/prisma")
const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.authToken;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decodedUser = verifyToken(token);

    if (!decodedUser || !decodedUser.id) {
      return res.status(401).json({ message: "Invalid token." });
    }

    const foundedUser = await prisma.user.findUnique({
      where: { id: decodedUser.id },
    });

    if (!foundedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    req.user = decodedUser;

    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "Unauthorized request." });
  }
};

module.exports = authMiddleware;
