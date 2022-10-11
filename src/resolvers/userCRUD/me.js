import getUserData from '../../utils/getUserData';
async function me(parent, args, {
    prisma,
    request
}, info) {
    const userData = getUserData(request)

    if (!(userData.verified)) {
        throw new Error("Access Denied")
    }
    const user = await prisma.query.user({
        where: {
            id: userData.id
        }
    }, info)
    return user
}

export {
    me
}