const asyncHandler = require("../utils/asyncHandler.js");
const ApiError = require("../utils/apiError.js");
const ApiResponse = require("../utils/apiResponse.js");
const User = require("../models/user.model.js");
const {uploadOnCloudinary} = require("../utils/cloudinary.js");



const registerController = asyncHandler( async (req, res) => {
  

    const { username, fullName, email, password } = req.body;
    const validateEmpty = [username, fullName, email, password].some((field)=>field?.trim()==="");
    if(validateEmpty) throw new ApiError(400, "Any required field cannot be Empty.");

    
    const userAlreadyExist = await User.findOne({ $or: [{ "username": username }, { "email": email }] });
    if(userAlreadyExist) throw new ApiError(409, "User already Exist.");



    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImgLocalPath;
    if(req.files && Array.isArray(req.files.coverImg) && req.files.coverImg.length > 0) {
        coverImgLocalPath = req.files.coverImg[0].path;
    }
    if(!avatarLocalPath) throw new ApiError(400, "Avatar File is required.");
    const avatarResp = await uploadOnCloudinary(avatarLocalPath);
    const coverImageResp = await uploadOnCloudinary(coverImgLocalPath);
    if(!avatarResp) throw new ApiError(400, "Avatar File is required.");

    const userResp = await User.create({
        username,
        fullName,
        email,
        password,
        "avatar": avatarResp.url,
        "coverImg": coverImageResp?.url || ""
    });

    const createdUser = await User.findById(userResp._id).select("-password -refreshToken");
    if(!createdUser) throw new ApiError(500, "Something went wrong!!!. Please Try Again.")

    return res.status(201).json( new ApiResponse(200, createdUser, "Account Created Successfully.") )


});


const generateTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken =  user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        
        await user.save();

        return { accessToken, refreshToken };
        
    } catch (error) {
        throw new ApiError(500, "Something Went wrong while generating Access and Refresh Tokens");
    }
}


const loginController = asyncHandler( async(req, res) => {
    const {username, email, password} = req.body;
    //validation
    if(!username && !email) throw new ApiError(400, "Username or email is required.");
    if(!password) throw new ApiError(400, "Password is required.");

    // user exist or not
    const userResp = await User.findOne({ $or: [{username}, {email}] });
    if(!userResp) throw new ApiError(404, "Account does not exist. Sign Up first.");

    // if user has entered correct password
    const isUserAuthenticated  = userResp.isPasswordCorrect(password);
    if(!isUserAuthenticated) throw new ApiError(401, "Invalid Credentials.");

    // generate Access Token and Refresh Token

    const { accessToken, refreshToken } = await generateTokens(userResp._id);


    const trimUserData = await User.findById(userResp._id).select("-password -refreshToken");
    const cookieOptions = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json( new ApiResponse(200, {"user": trimUserData, accessToken, refreshToken}, "Logged In Successfully"));



});

const logoutController = asyncHandler( async (req, res) => {
    const userId = req.userId;
    if(!userId) throw new ApiError(400, "Access Token was not Found. Try to login Again.");
    await User.findOneAndUpdate(userId, { $unset: { refreshToken: 1} }, { new: true });
    const cookieOptions = {
        httpOnly : true,
        secure : true
    }

    return res.status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json( new ApiResponse(200, {}, "Logged Out Sucessfully."));
})

module.exports = {registerController, loginController, logoutController}