const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");

const verifyJwt = asyncHandler( async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        // console.log("Access Token\n", req.cookies);
        if(!token) throw new ApiError(401, "Unauthorised Request");
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        if(!decodedToken) throw new ApiError(401, "Invalid Access Token");
        const userResp = await User.findById(decodedToken?._id).select("-password -refreshToken");
        if(!userResp) throw new ApiError(401, "Invalid Access Token");
        req.userId = userResp._id;
        next();
    } catch (error) {
        console.log(error);
        throw new ApiError(500, error.message);
    }
});

module.exports = verifyJwt