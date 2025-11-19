module.exports = {
    globDirectory: 'dist/',
    globPatterns: [
        '**/*.{html,json,js,css,png,jpg,jpeg,svg,ico,mp3}'
    ],
    swDest: 'dist/sw.js',
    ignoreURLParametersMatching: [
        /^utm_/,
        /^fbclid$/
    ],
    dontCacheBustURLsMatching: /\.[0-9a-f]{8,}\./,
    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
};
