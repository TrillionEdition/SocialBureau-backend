const errorHandler=(err,req,res,next)=>{
    const statusCode = err.status || (res.statusCode !== 200 ? res.statusCode : 500);
    const isProduction = process.env.NODE_ENV === 'production';
    console.error("Backend request failed", {
        status: statusCode,
        name: err.name,
        code: err.code,
    });
    res.status(statusCode).json({
        message: isProduction && statusCode >= 500 ? "Internal server error" : err.message,
        stack: isProduction ? null : err.stack,
        status: statusCode
    });
}
module.exports=errorHandler