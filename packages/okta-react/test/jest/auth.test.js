import Auth from '../../src/Auth';
import AuthJS from '@okta/okta-auth-js'
import OAuthError from '@okta/okta-auth-js/lib/errors/OAuthError';
import tokens from '../support/tokens';

const { standardAccessTokenParsed, standardIdTokenParsed } = tokens;
const pkg = require('../../package.json');

jest.mock('@okta/okta-auth-js');



describe('Auth component', () => {
  let mockAuthJsInstance;
  let mockAuthJsInstanceWithError;

  beforeEach(() => {
    mockAuthJsInstance = {
      userAgent: 'okta-auth-js',
      tokenManager: {
        get: jest.fn().mockImplementation(tokenName => {
          if (tokenName === 'idToken') {
            return Promise.resolve(standardIdTokenParsed);
          } else if (tokenName === 'accessToken') {
            return Promise.resolve(standardAccessTokenParsed);
          } else {
            throw new Error('Unknown token name: ' + tokenName);
          }
        }),
        on: jest.fn(),
      },
      token: {
        getWithRedirect: jest.fn()
      }
    };
    
    mockAuthJsInstanceWithError = {
      userAgent: 'okta-auth-js',
      tokenManager: {
        get: jest.fn().mockImplementation(() => {
          throw new Error();
        }),
        on: jest.fn(),
      },
      token: {
        getWithRedirect: jest.fn()
      }
    };

    AuthJS.mockImplementation(() => {
      return mockAuthJsInstance
    });
  });


  describe('onTokenError', () => {
    it('Listens to "error" event from TokenManager', () => {
      new Auth({
        issuer: 'https://foo/oauth2/default',
        clientId: 'foo',
        redirectUri: 'https://foo/redirect',
      });
      expect(mockAuthJsInstance.tokenManager.on).toHaveBeenCalledWith('error', expect.anything());
    });

    it('On OAuthError: "login_required" calls login()', () => {
      const expectedError = new OAuthError('login_required', 'fake error');
      let _onTokenError;
      jest.spyOn(mockAuthJsInstance.tokenManager, 'on').mockImplementation((error, handler) => {
        _onTokenError = handler;
      });
      const auth = new Auth({
        issuer: 'https://foo/oauth2/default',
        clientId: 'foo',
        redirectUri: 'https://foo/redirect',
      });

      jest.spyOn(auth, 'login').mockReturnValue();
      _onTokenError(expectedError);
      expect(auth.login).toHaveBeenCalled();
    });


    it('User can provide a custom handler', () => {
      const onTokenError = jest.fn();
      jest.spyOn(mockAuthJsInstance.tokenManager, 'on').mockImplementation((error, handler) => {
        expect(handler).toBe(onTokenError);
      });
      new Auth({
        issuer: 'https://foo/oauth2/default',
        clientId: 'foo',
        redirectUri: 'https://foo/redirect',
        onTokenError,
      });
    });
  });

  it('should throw if no issuer is provided', () => {
    function createInstance () {
      return new Auth();
    }
    expect(createInstance).toThrow()
  });
  it('should throw if an issuer that does not contain https is provided', () => {
    function createInstance () {
      return new Auth({
        issuer: 'http://foo.com'
      });
    }
    expect(createInstance).toThrow()
  });
  it('should throw if an issuer matching {yourOktaDomain} is provided', () => {
    function createInstance () {
      return new Auth({
        issuer: 'https://{yourOktaDomain}'
      });
    }
    expect(createInstance).toThrow()
  });
  it('should throw if an issuer matching -admin.okta.com is provided', () => {
    function createInstance () {
      return new Auth({
        issuer: 'https://foo-admin.okta.com'
      });
    }
    expect(createInstance).toThrow()
  });
  it('should throw if an issuer matching -admin.oktapreview.com is provided', () => {
    function createInstance () {
      return new Auth({
        issuer: 'https://foo-admin.oktapreview.com'
      });
    }
    expect(createInstance).toThrow()
  });
  it('should throw if an issuer matching -admin.okta-emea.com is provided', () => {
    function createInstance () {
      return new Auth({
        issuer: 'https://foo-admin.okta-emea.com'
      });
    }
    expect(createInstance).toThrow()
  });
  it('should throw if an issuer matching more than one ".com" is provided', () => {
    function createInstance () {
      return new Auth({
        issuer: 'https://foo.okta.com.com'
      });
    }
    expect(createInstance).toThrow()
  });
  it('should throw if an issuer matching more than one sequential "://" is provided', () => {
    function createInstance () {
      return new Auth({
        issuer: 'https://://foo.okta.com'
      });
    }
    expect(createInstance).toThrow()
  });
  it('should throw if an issuer matching more than one "://" is provided', () => {
    function createInstance () {
      return new Auth({
        issuer: 'https://foo.okta://.com'
      });
    }
    expect(createInstance).toThrow()
  });
  it('should throw if the client_id is not provided', () => {
    function createInstance () {
      return new Auth({
        issuer: 'https://foo/oauth2/default'
      });
    }
    expect(createInstance).toThrow()
  });
  it('should throw if a client_id matching {clientId} is provided', () => {
    function createInstance () {
      return new Auth({
        issuer: 'https://foo/oauth2/default',
        client_id: '{clientId}',
      });
    }
    expect(createInstance).toThrow()
  });
  it('should throw if the redirect_uri is not provided', () => {
    function createInstance () {
      return new Auth({
        issuer: 'https://foo/oauth2/default',
        client_id: 'foo'
      });
    }
    expect(createInstance).toThrow();
  });

  it('should throw if a redirect_uri matching {redirectUri} is provided', () => {
    function createInstance () {
      return new Auth({
        issuer: 'https://foo/oauth2/default',
        client_id: 'foo',
        redirect_uri: '{redirectUri}'
      });
    }
    expect(createInstance).toThrow();
  });

  it('accepts options in camel case', () => {
    function createInstance () {
      return new Auth({
        issuer: 'https://foo/oauth2/default',
        clientId: 'foo',
        redirectUri: 'https://foo/redirect'
      });
    }
    expect(createInstance).not.toThrow();
  });

  it('accepts the `pkce` option', () => {
    jest.spyOn(AuthJS.prototype, 'constructor');
    const options = {
      clientId: 'foo',
      issuer: 'https://foo/oauth2/default',
      redirectUri: 'foo',
      pkce: true,
    }

    new Auth(options);
    expect(AuthJS.prototype.constructor).toHaveBeenCalledWith(options);
  });



  test('sets the right user agent on AuthJS', () => {
    const auth = new Auth({
      issuer: 'https://foo/oauth2/default',
      client_id: 'foo',
      redirect_uri: 'foo'
    });
    const expectedUserAgent = `${pkg.name}/${pkg.version} okta-auth-js`;
    expect(auth._oktaAuth.userAgent).toMatch(expectedUserAgent);
  });
  test('can retrieve an accessToken from the tokenManager', async (done) => {
    const auth = new Auth({
      issuer: 'https://foo/oauth2/default',
      client_id: 'foo',
      redirect_uri: 'foo'
    });
    const accessToken = await auth.getAccessToken();
    expect(accessToken).toBe(standardAccessTokenParsed.accessToken);
    done();
  });
  test('builds the authorize request with correct params', () => {
    const auth = new Auth({
      issuer: 'https://foo/oauth2/default',
      client_id: 'foo',
      redirect_uri: 'foo'
    });
    auth.redirect();
    expect(mockAuthJsInstance.token.getWithRedirect).toHaveBeenCalledWith({
      responseType: ['id_token', 'token'],
      scopes: ['openid', 'email', 'profile']
    });
  });
  test('can override the authorize request builder scope with config params', () => {
    const auth = new Auth({
      issuer: 'https://foo/oauth2/default',
      client_id: 'foo',
      redirect_uri: 'foo',
      scope: ['openid', 'foo']
    });
    auth.redirect();
    expect(mockAuthJsInstance.token.getWithRedirect).toHaveBeenCalledWith({
      responseType: ['id_token', 'token'],
      scopes: ['openid', 'foo']
    });
  });
  test('can override the authorize request builder responseType with config params', () => {
    const auth = new Auth({
      issuer: 'https://foo/oauth2/default',
      client_id: 'foo',
      redirect_uri: 'foo',
      response_type: ['id_token']
    });
    auth.redirect();
    expect(mockAuthJsInstance.token.getWithRedirect).toHaveBeenCalledWith({
      responseType: ['id_token'],
      scopes: ['openid', 'email', 'profile']
    });
  });
  test('can override the authorize request builder with redirect params', () => {
    const auth = new Auth({
      issuer: 'https://foo/oauth2/default',
      client_id: 'foo',
      redirect_uri: 'foo'
    });
    const overrides = {
      scopes: ['openid', 'foo'],
      responseType: ['fake'],
    };
    auth.redirect(overrides);
    expect(mockAuthJsInstance.token.getWithRedirect).toHaveBeenCalledWith(overrides);
  });

  test('redirect params: can use legacy param format (scope string)', () => {
    const auth = new Auth({
      issuer: 'https://foo/oauth2/default',
      client_id: 'foo',
      redirect_uri: 'foo'
    });
    const overrides = {
      scope: 'openid foo',
      response_type: ['fake']
    };
    auth.redirect(overrides);
    expect(mockAuthJsInstance.token.getWithRedirect).toHaveBeenCalledWith(Object.assign(overrides, {
      scopes: ['openid', 'foo'],
      responseType: ['fake'],
    }));
  });

  test('redirect params: can use legacy param format (scope array)', () => {
    const auth = new Auth({
      issuer: 'https://foo/oauth2/default',
      client_id: 'foo',
      redirect_uri: 'foo'
    });
    const overrides = {
      scope: ['openid', 'foo'],
      response_type: ['fake']
    };
    auth.redirect(overrides);
    expect(mockAuthJsInstance.token.getWithRedirect).toHaveBeenCalledWith(Object.assign(overrides, {
      scopes: ['openid', 'foo'],
      responseType: ['fake'],
    }));
  });

  test('can append the authorize request builder with additionalParams through auth.redirect', () => {
    const auth = new Auth({
      issuer: 'https://foo/oauth2/default',
      client_id: 'foo',
      redirect_uri: 'foo'
    });
    auth.redirect({foo: 'bar'});
    expect(mockAuthJsInstance.token.getWithRedirect).toHaveBeenCalledWith({
      responseType: ['id_token', 'token'],
      scopes: ['openid', 'email', 'profile'],
      foo: 'bar'
    });
  });
  test('can append the authorize request builder with additionalParams through auth.login', () => {
    const auth = new Auth({
      issuer: 'https://foo/oauth2/default',
      client_id: 'foo',
      redirect_uri: 'foo'
    });
    auth.login('/', {foo: 'bar'});
    expect(mockAuthJsInstance.token.getWithRedirect).toHaveBeenCalledWith({
      responseType: ['id_token', 'token'],
      scopes: ['openid', 'email', 'profile'],
      foo: 'bar'
    });
  });
  test('isAuthenticated() returns true when the TokenManager returns an access token', async () => {
    const auth = new Auth({
      issuer: 'https://foo/oauth2/default',
      client_id: 'foo',
      redirect_uri: 'foo'
    });
    const authenticated = await auth.isAuthenticated();
    expect(mockAuthJsInstance.tokenManager.get).toHaveBeenCalledWith('accessToken');
    expect(authenticated).toBeTruthy();
  });
  test('isAuthenticated() returns false when the TokenManager does not return an access token', async () => {
    AuthJS.mockImplementation(() => {
      return mockAuthJsInstanceWithError
    });
    const auth = new Auth({
      issuer: 'https://foo/oauth2/default',
      client_id: 'foo',
      redirect_uri: 'foo'
    });
    const authenticated = await auth.isAuthenticated();
    expect(authenticated).toBeFalsy();
  });

  describe('login()', () => {
    it('By default, it will call redirect()', async () => {
      const auth = new Auth({
        issuer: 'https://foo/oauth2/default',
        clientId: 'foo',
        redirectUri: 'https://foo/redirect',
      });
      jest.spyOn(auth, 'redirect');
  
      await auth.login('/');
      expect(auth.redirect).toHaveBeenCalled();
    });
  
    it('will call a custom method "onAuthRequired" instead of redirect()', () => {
      const onAuthRequired = jest.fn();
      const auth = new Auth({
        issuer: 'https://foo/oauth2/default',
        clientId: 'foo',
        redirectUri: 'https://foo/redirect',
        onAuthRequired,
      });
      jest.spyOn(auth, 'redirect');
  
      auth.login('/');
      expect(onAuthRequired).toHaveBeenCalled();
      expect(auth.redirect).not.toHaveBeenCalled();
    });
  });

  describe('isAuthenticated', () => {
    it('Will be true if both idToken and accessToken are present', async () => {
      const auth = new Auth({
        issuer: 'https://foo/oauth2/default',
        clientId: 'foo',
        redirectUri: 'https://foo/redirect',
      });
      jest.spyOn(auth, 'getAccessToken');
      jest.spyOn(auth, 'getIdToken');

      const ret = await auth.isAuthenticated();
      expect(ret).toBe(true);

      expect(auth.getAccessToken).toHaveBeenCalled();
      expect(auth.getIdToken).toHaveBeenCalled();
    });

    it('Will be false if idToken is not present', async () => {
      const auth = new Auth({
        issuer: 'https://foo/oauth2/default',
        clientId: 'foo',
        redirectUri: 'https://foo/redirect',
      });
      jest.spyOn(auth, 'getAccessToken');
      jest.spyOn(auth, 'getIdToken');
      jest.spyOn(mockAuthJsInstance.tokenManager, 'get').mockImplementation(tokenName => {
        if (tokenName === 'idToken') {
          return Promise.resolve(null);
        } else if (tokenName === 'accessToken') {
          return Promise.resolve(standardAccessTokenParsed);
        } else {
          throw new Error('Unknown token name: ' + tokenName);
        }
      });
      const ret = await auth.isAuthenticated();
      expect(ret).toBe(false);

      expect(auth.getAccessToken).toHaveBeenCalled();
      expect(auth.getIdToken).toHaveBeenCalled();
    });

    it('Will be false if accessToken is not present', async () => {
      const auth = new Auth({
        issuer: 'https://foo/oauth2/default',
        clientId: 'foo',
        redirectUri: 'https://foo/redirect',
      });
      jest.spyOn(auth, 'getAccessToken');
      jest.spyOn(mockAuthJsInstance.tokenManager, 'get').mockImplementation(tokenName => {
        if (tokenName === 'idToken') {
          return Promise.resolve(standardIdTokenParsed);
        } else if (tokenName === 'accessToken') {
          return Promise.resolve(null);
        } else {
          throw new Error('Unknown token name: ' + tokenName);
        }
      });
      const ret = await auth.isAuthenticated();
      expect(ret).toBe(false);

      expect(auth.getAccessToken).toHaveBeenCalled();
    });

    it('Will return null if there is idToken in the URL', async () => {
      const auth = new Auth({
        issuer: 'https://foo/oauth2/default',
        clientId: 'foo',
        redirectUri: 'https://foo/redirect',
      });
      jest.spyOn(auth, 'getAccessToken');
      jest.spyOn(auth, 'getIdToken');

      location.hash = 'id_token=foo';
      const ret = await auth.isAuthenticated();
      expect(ret).toBe(null);

      expect(auth.getAccessToken).not.toHaveBeenCalled();
      expect(auth.getIdToken).not.toHaveBeenCalled();
    });

    it('Will return null if there is accesstoken in the URL', async () => {
      const auth = new Auth({
        issuer: 'https://foo/oauth2/default',
        clientId: 'foo',
        redirectUri: 'https://foo/redirect',
      });
      jest.spyOn(auth, 'getAccessToken');
      jest.spyOn(auth, 'getIdToken');

      location.hash = 'access_token=foo';
      const ret = await auth.isAuthenticated();
      expect(ret).toBe(null);

      expect(auth.getAccessToken).not.toHaveBeenCalled();
      expect(auth.getIdToken).not.toHaveBeenCalled();
    });

    it('Will return null if there is code in the URL', async () => {
      const auth = new Auth({
        issuer: 'https://foo/oauth2/default',
        clientId: 'foo',
        redirectUri: 'https://foo/redirect',
      });
      jest.spyOn(auth, 'getAccessToken');
      jest.spyOn(auth, 'getIdToken');

      location.hash = 'code=foo';
      const ret = await auth.isAuthenticated();
      expect(ret).toBe(null);

      expect(auth.getAccessToken).not.toHaveBeenCalled();
      expect(auth.getIdToken).not.toHaveBeenCalled();
    });

    it('Will call a custom function if "config.isAuthenticated"', async () => {
      const isAuthenticated = jest.fn().mockReturnValue(Promise.resolve('foo'));
      const auth = new Auth({
        issuer: 'https://foo/oauth2/default',
        clientId: 'foo',
        redirectUri: 'https://foo/redirect',
        isAuthenticated,
      });
      jest.spyOn(auth, 'getAccessToken');
      jest.spyOn(auth, 'getIdToken');
      const ret = await auth.isAuthenticated();
      expect(ret).toBe('foo');
      expect(isAuthenticated).toHaveBeenCalled();
      expect(auth.getAccessToken).not.toHaveBeenCalled();
      expect(auth.getIdToken).not.toHaveBeenCalled();
    });
  });

});
