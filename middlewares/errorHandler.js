const errorHandler=(err,req,res,next)=>{
    console.error("❌ BACKEND ERROR:", err);
    const statusCode = err.status || (res.statusCode !== 200 ? res.statusCode : 500);
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
        status: statusCode
    });
}
module.exports=errorHandler