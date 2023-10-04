export function isUpperCase(character) {
    if(isSpecialCharacter(character) || !/[a-zA-Z]/.test(character)) return false;
    return character === character.toUpperCase();
}

export function isSpecialCharacter(character) {
    return !/^[0-9a-zA-Z]+$/.test(character);
}
  
export function isLowerCase(character) {
    if(isSpecialCharacter(character)) return false;
    return character === character.toLowerCase();
}
