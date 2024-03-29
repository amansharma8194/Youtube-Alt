const { registerController, loginController, logoutController, refreshTokenController } = require("../controllers/user.controller.js");
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

router.route("/refresh-token").post(refreshTokenController)

module.exports = router;