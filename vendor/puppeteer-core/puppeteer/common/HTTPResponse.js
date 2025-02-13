/// <reference types="./HTTPResponse.d.ts" />
import { SecurityDetails } from "./SecurityDetails.js";
import { ProtocolError } from "./Errors.js";
import { base64Decode } from "../../vendor/std.ts";
/**
 * The HTTPResponse class represents responses which are received by the
 * {@link Page} class.
 *
 * @public
 */
export class HTTPResponse {
  /**
   * @internal
   */
  constructor(client, request, responsePayload, extraInfo) {
    this._contentPromise = null;
    this._bodyLoadedPromiseFulfill = () => {};
    this._headers = {};
    this._client = client;
    this._request = request;
    this._bodyLoadedPromise = new Promise((fulfill) => {
      this._bodyLoadedPromiseFulfill = fulfill;
    });
    this._remoteAddress = {
      ip: responsePayload.remoteIPAddress,
      port: responsePayload.remotePort,
    };
    this._statusText = this._parseStatusTextFromExtrInfo(extraInfo) ||
      responsePayload.statusText;
    this._url = request.url();
    this._fromDiskCache = !!responsePayload.fromDiskCache;
    this._fromServiceWorker = !!responsePayload.fromServiceWorker;
    this._status = extraInfo ? extraInfo.statusCode : responsePayload.status;
    const headers = extraInfo ? extraInfo.headers : responsePayload.headers;
    for (const key of Object.keys(headers)) {
      this._headers[key.toLowerCase()] = headers[key];
    }
    this._securityDetails = responsePayload.securityDetails
      ? new SecurityDetails(responsePayload.securityDetails)
      : null;
    this._timing = responsePayload.timing || null;
  }
  /**
   * @internal
   */
  _parseStatusTextFromExtrInfo(extraInfo) {
    if (!extraInfo || !extraInfo.headersText) {
      return;
    }
    const firstLine = extraInfo.headersText.split("\r", 1)[0];
    if (!firstLine) {
      return;
    }
    const match = firstLine.match(/[^ ]* [^ ]* (.*)/);
    if (!match) {
      return;
    }
    const statusText = match[1];
    if (!statusText) {
      return;
    }
    return statusText;
  }
  /**
   * @internal
   */
  _resolveBody(err) {
    if (err) {
      return this._bodyLoadedPromiseFulfill(err);
    }
    return this._bodyLoadedPromiseFulfill();
  }
  /**
   * @returns The IP address and port number used to connect to the remote
   * server.
   */
  remoteAddress() {
    return this._remoteAddress;
  }
  /**
   * @returns The URL of the response.
   */
  url() {
    return this._url;
  }
  /**
   * @returns True if the response was successful (status in the range 200-299).
   */
  ok() {
    // TODO: document === 0 case?
    return this._status === 0 || (this._status >= 200 && this._status <= 299);
  }
  /**
   * @returns The status code of the response (e.g., 200 for a success).
   */
  status() {
    return this._status;
  }
  /**
   * @returns  The status text of the response (e.g. usually an "OK" for a
   * success).
   */
  statusText() {
    return this._statusText;
  }
  /**
   * @returns An object with HTTP headers associated with the response. All
   * header names are lower-case.
   */
  headers() {
    return this._headers;
  }
  /**
   * @returns {@link SecurityDetails} if the response was received over the
   * secure connection, or `null` otherwise.
   */
  securityDetails() {
    return this._securityDetails;
  }
  /**
   * @returns Timing information related to the response.
   */
  timing() {
    return this._timing;
  }
  /**
   * @returns Promise which resolves to an ArrayBuffer with response body.
   */
  arrayBuffer() {
    if (!this._contentPromise) {
      this._contentPromise = this._bodyLoadedPromise.then(async (error) => {
        if (error) {
          throw error;
        }
        try {
          const response = await this._client.send("Network.getResponseBody", {
            requestId: this._request._requestId,
          });
          return response.base64Encoded
            ? base64Decode(response.body)
            : new TextEncoder().encode(response.body);
        } catch (error) {
          if (
            error instanceof ProtocolError &&
            error.originalMessage === "No resource with given identifier found"
          ) {
            throw new ProtocolError(
              "Could not load body for this request. This might happen if the request is a preflight request.",
            );
          }
          throw error;
        }
      });
    }
    return this._contentPromise;
  }
  /**
   * @returns Promise which resolves to a text representation of response body.
   */
  async text() {
    const content = await this.arrayBuffer();
    return new TextDecoder().decode(content);
  }
  /**
   * @returns Promise which resolves to a JSON representation of response body.
   *
   * @remarks
   *
   * This method will throw if the response body is not parsable via
   * `JSON.parse`.
   */
  async json() {
    const content = await this.text();
    return JSON.parse(content);
  }
  /**
   * @returns A matching {@link HTTPRequest} object.
   */
  request() {
    return this._request;
  }
  /**
   * @returns True if the response was served from either the browser's disk
   * cache or memory cache.
   */
  fromCache() {
    return this._fromDiskCache || this._request._fromMemoryCache;
  }
  /**
   * @returns True if the response was served by a service worker.
   */
  fromServiceWorker() {
    return this._fromServiceWorker;
  }
  /**
   * @returns A {@link Frame} that initiated this response, or `null` if
   * navigating to error pages.
   */
  frame() {
    return this._request.frame();
  }
}
//# sourceMappingURL=HTTPResponse.js.map
