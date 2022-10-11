async function icdsubcodes(parent, args, {
    request,
    prisma
}, info) {
    return prisma.query.iCDSubCodes(null, info)
}

export {
    icdsubcodes
}