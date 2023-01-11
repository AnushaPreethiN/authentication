const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//API1
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        )`;
    const dbResponse = await db.run(createUserQuery);
    const passwordLength = password.length;
    if (passwordLength > 5) {
      const hashedPassword = await bcrypt.hash(request.body.password, 10);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  }
});
//API2
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    //Invalid User
    response.status(400);
    response.send("Invalid user");
  } else {
    //check for the password
    const isPasswordMatch = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatch === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
//API3
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(checkUserQuery);
  //if user is not registered
  if (dbUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    //check for password
    const isValidPassword = await bcrypt(oldPassword, dbUser.password);
    if (isValidPassword === true) {
      const lengthOfPassword = newPassword.length;
      if (lengthOfPassword < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const encryptedPassword = await bcrypt.hash(newPassword, 10);
        const updateQuery = `UPDATE user SET password = '${encryptedPassword}' 
            WHERE username='${username}'`;
        await db.run(updateQuery);
        response.send("Password Updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
