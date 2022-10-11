// JWT for data transmission for authtoken and authorization
import jwt from 'jsonwebtoken'
import config from 'config'

const genUserToken = (user) => {
    const token = jwt.sign({
        id: user.id,
        role: user.role,
        isAdmin: user.isAdmin,
        verified: user.verified
    }, config.get('secret-key'), {
        expiresIn: "3 days"
    })
    return token
}

export default genUserToken