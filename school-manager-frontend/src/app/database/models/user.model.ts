export class User {
    constructor(
        public emaiL: string,
        public id: string,
        private _token: string,
        public _tokenExpirationDate: Date) {}

        get token() {
            if(!this._tokenExpirationDate || new Date() > this._tokenExpirationDate) {
            return null;
        }
        return this._token;
    }
}