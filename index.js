const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const argon2 = require("argon2");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger-output.json");
const jwt = require("jsonwebtoken");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const UserSchema = new Schema(
  {
    username: { type: String, unique: true },
    password: { type: String },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);
UserSchema.pre("save", async function (next) {
  const user = this;

  if (!user.isModified("password")) return next();
  console.log(this);
  try {
    user.password = await argon2.hash(user.password);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model("users", UserSchema);

const TransactionSchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, ref: "users" },
    money: { type: Number, default: 0, required: true },
    type: { type: String, enum: ["withdraw", "deposit"] },
  },
  { timestamps: true, versionKey: false }
);

TransactionSchema.pre("save", async function (next) {
  const transact = this;

  try {
    const user = await User.findById(transact.userId);
    if (transact.type === "withdraw") {
      if (user.balance < transact.money) {
        return next(
          new Error("Cannot withdraw with money greater than balance")
        );
      }
      user.balance = user.balance - transact.money;
      user.save();
      console.log(user.balance, transact.money);
      return next();
    } else if (transact.type === "deposit") {
      user.balance = user.balance + transact.money;
      user.save();
      return next();
    }
  } catch (error) {
    return next(error);
  }
});
const Transaction = mongoose.model("transactions", TransactionSchema);

const connectAndRetry = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://test:kpcl8ihvWZHgCqzU@cluster0.rrcyu.mongodb.net/test"
    );
    console.log("Connected");
  } catch (error) {
    console.log("Connecting in 5000ms .....");
    setTimeout(connectAndRetry, 5000);
  }
};

connectAndRetry();

app.get("/api/users", async (req, res) => {
  try {
    return res.json({ success: true, users: await User.find() });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
      error,
    });
  }
});

app.post("/api/users", async (req, res) => {
  const { username, password } = req.body;
  const user = new User({ username, password });
  try {
    await user.save();
    // const user = await User.create({username, password})
    return res.status(201).send({ success: true, message: "saved", user });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
      error,
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(400)
        .json({
          success: false,
          message: "username or password is not correct",
        });
    }
    if (!(await argon2.verify(user.password, password))) {
      return res
        .status(400)
        .json({
          success: false,
          message: "username or password is not correct",
        });
    }
    return res
      .status(200)
      .json({
        success: true,
        message: "login successful",
        token: jwt.sign({ sub: user._id }, "secret"),
      });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Data is not valid, Please check it again",
      err,
    });
  }
});

app.patch("/api/password", (req, res) => {
  User.findOne({ username: req.body.username }, async (err, user) => {
    if (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Data is not valid, Please check it again",
        err,
      });
    } else {
      user.password = req.body.newPassword;
      user.save((err, data) => {
        if (err) {
          console.log(err);
          return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            err,
          });
        }
        res
          .status(200)
          .json({
            success: true,
            message: "password was changed successfully !!",
          });
      });
    }
  });
});

app.post("/api/transact", (req, res) => {
  const { userId, money, type } = req.body;
  new Transaction({ userId, money, type }).save((err, transaction) => {
    if (err) {
      if(err.message){

        console.log(err.message);
      }
      return res.status(500).json(err);
    } else {
      return res.status(201).json({ success: true, transaction });
    }
  });
});
app.listen(process.env.PORT || 4000);
