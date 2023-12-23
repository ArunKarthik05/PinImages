const mongoose = require("mongoose");
const dbUrl =
  "mongodb+srv://user:user@pintrest.25e01xd.mongodb.net/users?retryWrites=true&w=majority";
const plm = require("passport-local-mongoose");

mongoose
  .connect(dbUrl)
  .then(() => {
    console.log("connected");
  })
  .catch((err) => console.log(err));
const userSchema = mongoose.Schema({
  username: {
    required: true,
    type: String,
    unique: true,
  },
  profilepic: {
    type: String,
  },
  fullname: {
    type: String,
  },
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
  ],
  savedPosts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
  ],
  dp: {
    type: String,
  },
  password: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  contestsJoined: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
    },
  ],

  contestsWon: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
    },
  ],
});

userSchema.plugin(plm);
module.exports = mongoose.model("User", userSchema);
