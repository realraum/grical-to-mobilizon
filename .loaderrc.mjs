export default {
  loaders: [
    {
      test: /\.(graphql|gql)$/,
      use: [
        {
          loader: "graphql-tag/loader.js",
          options: {
            esm: true
          }
        }
      ]
    },
  ],
};
