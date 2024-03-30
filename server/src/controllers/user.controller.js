const asyncHandler = require("../utils/asyncHandler.js");
const ApiError = require("../utils/apiError.js");
const ApiResponse = require("../utils/apiResponse.js");
const User = require("../models/user.model.js");
const {uploadOnCloudinary, deleteOnCloudinary} = require("../utils/cloudinary.js");
const jwt = require("jsonwebtoken");
const { default: mongoose } = require("mongoose");


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
    const userId = req.user._id;
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

// takes refresh token from the user and resets refresh token and access token
const refreshTokenController = asyncHandler( async (req, res) => {


    const clientRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!clientRefreshToken) throw new ApiError(401, "Unauthorised Request");


    const decodedClientRefreshToken = jwt.verify(clientRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const userResp = await User.findById(decodedClientRefreshToken._id);
    if(!userResp || clientRefreshToken!==userResp.refreshToken) throw new ApiError(401, "Invalid Refresh Token");


    const {accessToken, refreshToken} = await generateTokens(userResp._id);
    userResp.refreshToken = refreshToken;
    userResp.save();


    const cookieOptions = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json( new ApiResponse(200, { "accessToken": accessToken, "refreshToken": refreshToken }, "Tokens Updated Successfully."));
})


const updatePasswordController = asyncHandler( async(req, res) => {
    
    const {oldPassword, newPassword} = req.body;
    const userResp = await User.findById(req.user?._id);
    const isPasswordCorrect = await userResp.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect) throw new ApiError(400, "Invalid Password");
    userResp.password = newPassword;
    await userResp.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200, {}, "Password Updated Successfully"));
})

const getUserController = asyncHandler( async(req, res)=> {
    return res.status(200).json(new ApiResponse(200, req.user, "User fetched Successfully"));
})

const changeAvatarController = asyncHandler( async(req, res) => {
    const userId = req.user?._id;
    const newAvatarLocalPath = req.file?.path;
    if(!userId) throw new ApiError(400, "Avatar Local Path is Missing.");
    // delete old image on cloudinary
    const public_id_cloudinary = req.user.avatar.split("/").pop();
    await deleteOnCloudinary(public_id_cloudinary);
    // upload new image on cloudinary
    const uploadAvatarResp = await uploadOnCloudinary(newAvatarLocalPath);
    if(!uploadAvatarResp || !uploadAvatarResp.url) throw new ApiError(400, "Error while uploading avatar file on Cloudinary");
    const userResp = await User.findByIdAndUpdate(userId, {
        $set : {
            avatar: uploadAvatarResp.url
        }
    },{ new: true}).select("-password -refreshToken");
    return res.status(200)
    .json(new ApiResponse(200, userResp, "Avatar Updated Successfully."))
});

const changeCoverImgController = asyncHandler( async(req, res) => {
    const userId = req.user?._id;
    const newCoverImgLocalPath = req.file?.path;
    if(!userId) throw new ApiError(400, "Avatar Local Path is Missing.");


    // delete old image on cloudinary
    if(req.user.coverImg){
        const public_id_cloudinary = req.user.coverImg.split("/").pop();
        await deleteOnCloudinary(public_id_cloudinary);
    }
    
    // upload new image on cloudinary
    const uploadCoverImgResp = await uploadOnCloudinary(newCoverImgLocalPath);
    if(!uploadCoverImgResp || !uploadCoverImgResp.url) throw new ApiError(400, "Error while uploading cover image file on Cloudinary");
    const userResp = await User.findByIdAndUpdate(userId, {
        $set : {
            coverImg : uploadCoverImgResp.url
        }
    },{ new: true}).select("-password -refreshToken");
    return res.status(200)
    .json(new ApiResponse(200, userResp, "Cover Image Updated Successfully."))
});

const getChannelDetailsController = asyncHandler(async(req, res)=>{
    const username = req.params;
    if(!username?.trim()) throw new ApiError(400, "Username is required to get Profile data.");
    const channelDetails =  await User.aggregate([
        // find user details
        {
            $match: username
        },
        //find subscribers
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        //find subscribed To
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        // add fields
        {
           $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isCurChannelSubscribed: {
                    $cond: {
                        if: {$in: [req.user._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false  
                    }
                }
           }
        },
        // exclude fields
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImg: 1,
                email: 1,
                isCurChannelSubscribed: 1,
                subscribersCount: 1,
                subscribedToCount: 1
            }
        }
    ]);
    console.log("--------- Channel details---------\n", channelDetails);
    if(!channelDetails?.length) throw new ApiError(400, "channel Does not Exist");
    return res.status(200)
    .json(200, channelDetails[0], "Channel Details Fetched Successfully");
});

const getWatchHistoryController = asyncHandler( async(req, res) => {
    const userRespWithHistory = User.aggregate([
        {
            $match: mongoose.Types.ObjectId(req.user._id)
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner"
                        } 
                    },
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);
    return res.status(200)
    .json(200, userRespWithHistory[0].watchHistory, "watch History fetched Successfully.");
})


module.exports = 
{   registerController, 
    loginController, 
    logoutController, 
    refreshTokenController,
    updatePasswordController,
    getUserController,
    changeAvatarController,
    changeCoverImgController,
    getChannelDetailsController,
    getWatchHistoryController
}