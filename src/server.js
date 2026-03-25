const app = require("./app");
const { pool } = require("./config/database");

const port = Number(process.env.PORT || 5000);

const start = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

start();
