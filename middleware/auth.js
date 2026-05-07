import jwt from  'jsonwebtoken'
export const verifyAdmin(req,res,next)=>{
    const token = req.header('Authorization');
    if(!token) return res.status(401).json({message: 'Token tidak ada'})
    try{
        const verified = jwt.verify(token.replace('Bearer ',''), process.env.JWT_SECRET)
        req.admin = verified
        next()
    }
    catch(error){
        return res.status(403).json({message: 'Token tidak valid'})    
    }
}