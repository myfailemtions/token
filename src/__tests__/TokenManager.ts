import { Observable } from 'rxjs/Observable';

import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/observable/timer';
import 'rxjs/add/observable/empty';

import { TokenRefreshingError } from '../TokenRefreshingError';
import { TokenManager } from '../TokenManager';
import { TokenPair } from '../TokenPair';

describe('Token Manager', () => {

    const emptyTokenRefresher = () => new Promise<TokenPair>(undefined);

    it('Initial tokens must be empty', () => {
        const tokenManager = new TokenManager(emptyTokenRefresher);

        return tokenManager.getTokens()
            .then(tokens => {
                expect(tokens.accessToken).toEqual('');
                expect(tokens.refreshToken).toEqual('');
            });
    });

    it('Check initialization with tokens', (done) => {
        const accessToken = '234jk3458234lj3459435';
        const refreshToken = 'dsklflshsd2344328324j';

        const tokenManager = new TokenManager(emptyTokenRefresher, { accessToken, refreshToken });

        tokenManager.getTokens()
            .then(tokens => {
                expect(tokens.accessToken).toEqual(accessToken);
                expect(tokens.refreshToken).toEqual(refreshToken);
                done();
            });
    });

    it('Check updating tokens', (done) => {
        const tokenManager = new TokenManager(emptyTokenRefresher);

        const accessToken = '234jk3458234lj3459435';
        const refreshToken = 'dsklflshsd2344328324j';

        tokenManager.updateTokens({ accessToken, refreshToken });

        tokenManager.getTokens()
            .then(tokens => {
                expect(tokens.accessToken).toEqual(accessToken);
                expect(tokens.refreshToken).toEqual(refreshToken);
                done();
            });
    });

    it('Check tokens on refreshing (must return refreshed token after starting refreshing process)', (done) => {
        const refreshedAccessToken = 'jhauenw22355345s';
        const refreshedRefreshToken = 'sdjfwer8q990wwerl';

        const tokenRefresher = () => new Promise<TokenPair>((resolve) => {
            setInterval(() => {
                resolve({ accessToken: refreshedAccessToken, refreshToken: refreshedRefreshToken });
            }, 0.2);
        });

        const initialAccessToken = '234jk3458234lj3459435';
        const initialRefreshToken = 'dsklflshsd2344328324j';

        const tokenManager = new TokenManager(tokenRefresher, {
            accessToken: initialAccessToken,
            refreshToken: initialRefreshToken,
        });

        tokenManager.refreshTokens().then();

        tokenManager.getTokens()
            .then(tokens => {
                expect(tokens.accessToken).toEqual(refreshedAccessToken);
                expect(tokens.refreshToken).toEqual(refreshedRefreshToken);
                done();
            });
    });

    it('Should repeat token refreshing on fail', (done) => {
        const refreshedAccessToken = 'jhauenw22355345s';
        const refreshedRefreshToken = 'sdjfwer8q990wwerl';

        const counter = { refreshingCount: 0 };

        const tokenRefresher = () => new Promise<TokenPair>((resolve, reject) => {
            Observable
                .timer(0.1)
                .subscribe(() => {
                    if (counter.refreshingCount >= 1) {
                        counter.refreshingCount++;

                        resolve({ accessToken: refreshedAccessToken, refreshToken: refreshedRefreshToken });
                    } else {
                        counter.refreshingCount++;
                        reject('Error on refreshing tokens');
                    }
                });
        });

        const tokenManager = new TokenManager(tokenRefresher);

        tokenManager
            .refreshTokens()
            .then();

        tokenManager.getTokens()
            .then(tokens => {
                expect(tokens.accessToken).toEqual(refreshedAccessToken);
                expect(tokens.refreshToken).toEqual(refreshedRefreshToken);
                done();
            });
    });

    it('Should return same tokens on multiple refreshing requests', (done) => {
        const randomToken = () => uuid() as string;

        const tokenRefresher = () => new Promise<TokenPair>(resolve => {
            setInterval(() => {
                resolve({ accessToken: randomToken(), refreshToken: randomToken() });
            }, 0.2);
        });

        const tokenManager = new TokenManager(tokenRefresher);

        tokenManager.refreshTokens().then();
        tokenManager.refreshTokens().then();
        tokenManager.refreshTokens().then();

        const request1 = tokenManager.getTokens();
        const request2 = tokenManager.getTokens();
        const request3 = tokenManager.getTokens();

        Observable
            .combineLatest(request1, request2, request3)
            .subscribe((tokenGroups: TokenPair[]) => {

                const [tokenPair1, tokenPair2, tokenPair3] = tokenGroups;

                const isAccessTokensEquals =
                    (tokenPair1.accessToken === tokenPair2.accessToken) &&
                    (tokenPair2.accessToken === tokenPair3.accessToken);

                const isRefreshTokenEquals =
                    (tokenPair1.refreshToken === tokenPair2.refreshToken) &&
                    (tokenPair2.refreshToken === tokenPair3.refreshToken);

                expect(isAccessTokensEquals).toEqual(true);
                expect(isRefreshTokenEquals).toEqual(true);

                done();
            });
    });

    it('Should return same tokens for already running request', () => {
        const refreshedAccessToken = 'jhauenw22355345s';
        const refreshedRefreshToken = 'sdjfwer8q990wwerl';

        const tokenRefresher = () => new Promise<TokenPair>((resolve) => {
            setInterval(() => {
                resolve({ accessToken: refreshedAccessToken, refreshToken: refreshedRefreshToken });
            }, 0.2);
        });

        const updatedAccessToken = 'dfkflhr234sgdg';
        const updatedRefreshToken = 'uaadfbndsvl36vd';

        const tokenManager = new TokenManager(tokenRefresher);

        tokenManager.refreshTokens()
            .then(tokens => {
                expect(tokens.accessToken).toEqual(refreshedAccessToken);
                expect(tokens.refreshToken).toEqual(refreshedRefreshToken);
            });

        tokenManager.updateTokens({ accessToken: updatedAccessToken, refreshToken: updatedRefreshToken });
    });

    it('Should throw Token Refreshing Error if server unavailable', (done) => {
        const tokenRefresher = () => new Promise<TokenPair>((resolve, reject) => {
            reject('Server unavailable');
        });

        const tokenManager = new TokenManager(tokenRefresher);

        tokenManager.refreshTokens()
            .then(undefined, error => {
                expect(error instanceof TokenRefreshingError).toBeTruthy();
                done();
            });
    });
});

const uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        // tslint:disable-next-line:no-bitwise
        const r = Math.random() * 16 | 0;
        // tslint:disable-next-line:no-bitwise
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
