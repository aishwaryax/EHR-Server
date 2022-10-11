import Joi from 'joi'
import { capitalizeFirstLetter } from '../../utils/misc';

const query = Joi.object().keys({
    name: Joi.string().required(),
    skip: Joi.number().required()
})

async function getCountry(parent, args, {
    prisma
}, info) {
    const result = await Joi.validate({
        name: args.name,
        skip: args.skip
    }, query);
    if (result.error) {
        throw new Error("Invalid Data")
    }
    const name = capitalizeFirstLetter(args.name)
    const country = await prisma.query.countries({
        where: {
            countryName_starts_with: name
        },
        orderBy: "countryName_ASC",
        first: 5,
        skip: args.skip
    }, info)
    return country
}

async function getRegion(parent, args, {
    prisma
}, info) {
    const result = await Joi.validate({
        name: args.name,
        skip: args.skip
    }, query);
    if (result.error) {
        throw new Error("Invalid Data")
    }
    const name = capitalizeFirstLetter(args.name)
    const country = await prisma.query.regions({
        where: {
            region_starts_with: name
        },
        orderBy: "region_ASC",
        first: 5,
        skip: args.skip
    }, info)
    return country
}

export {
    getCountry,
    getRegion
}