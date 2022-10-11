import bcrypt from 'bcrypt';

const hashPassword = (password) => {
    if (password.length < 8) {
        throw new Error('Password must be greater than 8 character')
    }
    return bcrypt.hash(password, 10)
}

export default hashPassword