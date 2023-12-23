var express = require("express");
var router = express.Router();

const ContestModel = require("./contests");
const userModel = require("./users");
const postModel = require("./posts");
const bodyParser = require("body-parser");
const { upload, dpupload } = require("./multer");

const passport = require("passport");
const localStrategy = require("passport-local");
passport.use(new localStrategy(userModel.authenticate()));

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "PinImages-by Karthik" });
});

//----------------Login------------------//
router.get("/login", function (req, res, next) {
  res.render("login", { title: "Login", error: req.flash("error") });
});
//----------------PROFILE------------------//
router.get("/profile", isLoggedIn, async function (req, res, next) {
  const user = await userModel
    .findOne({
      username: req.session.passport.user,
    })
    .populate("posts")
    .populate("savedPosts");
  let totalLikes = 0;

  const likePromises = user.posts.map(async (post) => {
    totalLikes += post.likes.length;
  });

  await Promise.all(likePromises);

  //console.log(totalLikes);

  res.render("new", { user, totalLikes, req });
});
//----------------REGISTER------------------//
router.post("/register", function (req, res) {
  var userData = new userModel({
    email: req.body.email,
    username: req.body.username,
    fullname: req.body.fullname,
  });

  userModel.register(userData, req.body.password).then(function () {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/login");
    });
  });
});
//----------------CHECK FOR LOGIN------------------//
router.post(
  "/check",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (req, res) {}
);
//----------------FEED------------------//
router.get("/feed", isLoggedIn, async function (req, res, next) {
  try {
    const allPosts = await postModel
      .find()
      .populate("user")
      .sort({ createdAt: -1 });
    res.render("feed", { title: "feed", allPosts, req });
  } catch (error) {
    console.error("Error retrieving posts:", error);
    res.status(500).send("Internal Server Error");
  }
});
//----------------UPLOAD FILE------------------//
router.post(
  "/upload",
  isLoggedIn,
  upload.single("file"),
  async function (req, res, next) {
    if (!req.file) {
      return res
        .status(400)
        .send("Sorry there isnt any file.Please upload one");
    }
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    const post = await postModel.create({
      user: user._id,
      postText: req.body.caption,
      image: req.file.filename,
    });
    try {
      user.posts.push(post._id);
      await user.save();
      res.redirect("/profile");
    } catch (error) {
      console.error("Error uploading post:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
// -------------------DP---------------
router.post(
  "/uploaddp",
  isLoggedIn,
  dpupload.single("profileImage"),
  async function (req, res, next) {
    try {
      if (!req.file) {
        return res
          .status(400)
          .send("Sorry, there is no file. Please upload one.");
      }

      // Update the user's profilepic field with the filename of the uploaded image
      const user = await userModel.findOne({
        username: req.session.passport.user,
      });
      user.profilepic = req.file.filename;
      await user.save();

      return res.redirect("/profile");
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      return res.status(500).send("Internal Server Error");
    }
  }
);
// ---------------------SAVE----------------
router.post("/save/:postId", isLoggedIn, async (req, res) => {
  const postId = req.params.postId;
  const userId = req.user._id;

  const referringPage = req.get("Referer");
  const redirectUrl = referringPage.includes("/feed") ? "/feed" : "/profile";
  try {
    const user = await userModel.findById(userId);
    if (user.savedPosts.includes(postId)) {
      req.flash("saved", "You have already saved this post");
      return res.redirect(`${redirectUrl}?result=saved`);
    }

    // Add user ID to the saved array
    user.savedPosts.push(postId);
    await user.save();

    req.flash("success", "Post saved successfully!");
    return res.redirect(`${redirectUrl}?result=savesuccess`);
  } catch (error) {
    console.error("Error saving post:", error);
    req.flash("error", "Internal Server Error");

    // Redirect to a default page in case of an error
    return res.redirect(`${redirectUrl}`);
  }
});

//----------------LIKE A POST------------------//
router.post("/like/:postId", isLoggedIn, async function (req, res) {
  const postId = req.params.postId;
  const userId = req.user._id;

  // Get the referring page from the Referer header
  const referringPage = req.get("Referer");
  const redirectUrl = referringPage.includes("/feed") ? "/feed" : "/profile";

  try {
    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).redirect(`${redirectUrl}?result=notfound`);
    }

    // Check if the user already liked the post
    if (post.likes.includes(userId)) {
      req.flash("liked", "You have already liked this post");
      return res.redirect(`${redirectUrl}?result=liked`);
    }

    // Add user ID to the likes array
    post.likes.push(userId);
    await post.save();

    req.flash("success", "Post liked successfully!");
    return res.redirect(`${redirectUrl}?result=success`);
  } catch (error) {
    console.error("Error liking post:", error);
    req.flash("error", "Internal Server Error");

    // Redirect to a default page in case of an error
    return res.redirect(`${redirectUrl}`);
  }
});

//----------------LOGOUT------------------//
router.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      console.error("Error logging out:", err);
      // Redirect to home or handle error as needed
    }
  });
  res.redirect("/login");
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}
// ---------------CONTESTS--------------------//
router.get("/contest", async function (req, res) {
  const allContests = await ContestModel.find();
  res.render("contest", { title: "Contests Page", allContests, req });
});
// --------------Create------------------
router.post("/create-contest", async function (req, res) {
  var endDateTime = req.body.endDateTime;
  try {
    const parsedEndDateTime = new Date(endDateTime);
    const newContest = new ContestModel({
      name: req.body.name,
      endDate: parsedEndDateTime,
    });
    await newContest.save();
    req.flash("success", "Contest created successfully");
    return res.redirect("/contest?result=success");
  } catch (err) {
    return res.redirect("/contest?result=error");
  }
});
// ------------------JOIN--------------------//
router.post("/join-contest/:contestId", async function (req, res) {
  try {
    const userId = req.user._id;
    const user = await userModel.findOne({ _id: userId });
    const contestId = req.params.contestId;
    const contest = await ContestModel.findOne({
      _id: contestId,
    });
    //console.log(contest);
    if (contest.participants.includes(userId)) {
      req.flash("liked", "You have already liked this post");
      return res.redirect("/contest?result=alreadyJoined");
    }

    contest.participants.push(userId);
    await contest.save();
    user.contestsJoined.push(contestId);
    await user.save();
    return res.redirect("/contest?result=added");
  } catch (e) {
    //console.log(e);
    return res.redirect("/contest?result=failed");
  }
});
// -------------View Contest------------//
router.get("/view-contest/:contestId", async function (req, res) {
  const contestId = req.params.contestId;
  const contest = await ContestModel.findOne({
    _id: contestId,
  });
  const allPosts = await ContestModel.findOne({ _id: contestId }).populate(
    "posts"
  );
  console.log(allPosts);
  res.render("view-contest", { contest, allPosts });
});
router.post("/view-contest/:contestId", async function (req, res) {
  const contestId = req.params.contestId;
  const contest = await ContestModel.findOne({
    _id: contestId,
  });
  const allPosts = contest.populate("posts");
  res.render("view-contest", { contest, allPosts });
});
// ----------------Add post--------------//
router.post(
  "/upload/:contestId",
  isLoggedIn,
  upload.single("file"),
  async function (req, res, next) {
    const contestId = req.params.contestId;
    if (!req.file) {
      return res
        .status(400)
        .send("Sorry there isnt any file.Please upload one");
    }

    const contest = await ContestModel.findOne({ _id: contestId });
    const user = await userModel.findOne({ _id: req.user._id });
    const post = await postModel.create({
      user: user._id,
      postText: req.body.caption,
      image: req.file.filename,
    });
    try {
      // user.post.push(post._id);
      // await user.save();
      contest.posts.push(post._id);
      await contest.save();
      res.redirect(`/view-contest/${contestId}`);
    } catch (error) {
      console.error("Error uploading post:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
module.exports = router;
