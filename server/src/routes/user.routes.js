const { registerController, loginController, logoutController, refreshTokenController, updatePasswordController, getUserController, changeAvatarController, changeCoverImgController, getChannelDetailsController, getWatchHistoryController } = require("../controllers/user.controller.js");
const verifyJwt = require("../middlewares/auth.middleware.js");
const router = require("express").Router();
const multerUpload = require("../middlewares/multer.middleware.js");

router.route("/register").post(
    multerUpload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImg",
            maxCount: 1
        }
    ]),
    registerController);


router.route("/login").post(loginController);

router.route("/logout").post(verifyJwt, logoutController);

router.route("/refresh-token").post(refreshTokenController);

router.route("/change-password").post(verifyJwt, updatePasswordController);

router.route("/user").get(verifyJwt, getUserController);

router.route("/change-avatar").post(verifyJwt, multerUpload.single("avatar") ,changeAvatarController);

router.route("/change-coverImg").post(verifyJwt, multerUpload.single("coverImage"), changeCoverImgController);

router.route("/channels/:username").post(getChannelDetailsController);

router.route("/watch-history").post(verifyJwt, getWatchHistoryController);

module.exports = router;