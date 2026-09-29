const { Router } = require("express");
const prisma = require("../utils/prisma");

const router = Router();

// Public: needed by the signup screen and portal forms before a city can be chosen.
router.get("/", async (req, res) => {
  try {
    const cities = await prisma.city.findMany({
      orderBy: [{ state: "asc" }, { name: "asc" }],
      select: { id: true, name: true, state: true, latitude: true, longitude: true },
    });
    res.json(cities);
  } catch (err) {
    console.error("Get cities error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
