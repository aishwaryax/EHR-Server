import Joi from 'joi'
import { capitalizeFirstLetter } from '../../utils/misc';

const query = Joi.object().keys({
    name: Joi.string().required(),
    skip: Joi.number().required()
})

async function getHospital(parent, args, {
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
    const hospital = await prisma.query.hospitals({
        where: {
            name_starts_with: name
        },
        orderBy: "name_ASC",
        first: 5,
        skip: args.skip
    }, info)
    return hospital
}

export {
    getHospital
}