async function icdcodes(parent, args, {
    request,
    prisma
}, info) {
    return prisma.query.iCDCodes(null, info)
}

export {
    icdcodes
}