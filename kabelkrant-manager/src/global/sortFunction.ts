export function sortFilesWithNumbers(a: string, b: string){
    // Sort the file so that 11 is afeter 9 

    // Retrieve the first number in the string
    const aNumber = a.match(/\d+/)?.[0]
    const bNumber = b.match(/\d+/)?.[0]

    // If not found return the normal sort
    if(!aNumber || !bNumber) return a.localeCompare(b)

    // Sort on the number value
    const aNumberValue = parseInt(aNumber)
    const bNumberValue = parseInt(bNumber)

    return aNumberValue - bNumberValue


}
