function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
function capitalizeFirstLetter(ArgString) {
    let string = ArgString.toLowerCase();
    return string.charAt(0).toUpperCase() + string.slice(1);
}
export {
    pad,
    capitalizeFirstLetter
}