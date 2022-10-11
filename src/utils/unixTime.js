
const unixTime = () =>{
    if(!Date.now){
        
        Date.now = () => {return new Date().getTime()}

    }
}

export default unixTime;