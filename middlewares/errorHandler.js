const {stack}=require("../routes")
const errorHandler=(err,req,res,next)=>{
    console.error("❌ BACKEND ERROR:", err);
    res.status(err.status||500).json({
        message:err.message,
        stack:err.stack,
        status:err.status||500
    })
}
module.exports=errorHandler