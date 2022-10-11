import bcrypt from 'bcrypt'
import Joi from 'joi'

import genUserToken from '../../utils/genUserToken'

const loginSchema = Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,32}$/).min(8).required()
})

async function login(parent, args, {
    prisma
}, info) {
    const result = await Joi.validate({
        email: args.data.email,
        password: args.data.password
    }, loginSchema);
    if (result.error) {
        throw new Error("Invalid Data")
    }
    const user = await prisma.query.user({
        where: {
            email: args.data.email
        }
    })
    if (!user) {
        throw new Error("Invalid User")
    }
    const passwordMatch = await bcrypt.compare(args.data.password, user.password)
    if (!passwordMatch) {
        throw new Error("Incorrect password")
    } else if (!user.verified) {
        throw new Error("Not verified")
    } else {
        const token = genUserToken(user)
        return {
            user,
            token
        }
    }
}

export {
    login
}