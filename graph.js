import { gql } from 'graphql-request'

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      refreshToken
      user {
        id
        email
        role
      }
    }
  }
`;

console.log(gql(`
  mutation Bal($e: String!) {
    e(e: $e) {
      dd
    }
  }

  mutation Bale($e: String!) {
    e(e: $e) {
      dd
    }
  }
`))

export const REFRESH_MUTATION = gql`
  mutation Refresh($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
    }
  }
`

export const EVENT_MUTATION = gql`
  type Event {
    id: ID!
    name: String!
    location: String!
    date: String!
  }

  type Mutation {
    createEvent(name: String!, location: String!, date: String!): Event
  }
`

export const EVENT_LIST = gql`
  query {
    group(preferredUsername: "realraum") {
      organizedEvents(limit: 100000) {
        elements {
          id,
          uuid,
          url,
          title,
          description,
          beginsOn,
          endsOn,
          status,
          tags {
            title
          },
          picture {
            url
          },
          physicalAddress {
            id,
            description,
            locality
          }
        }
        total
      }
    }
  }
`

export const EVENT_ADD = gql`
  mutation EventAdd(title: String!, description: String!, tags: [String]!, gricalUrl: String!) {
    createEvent(
      title: $title
      description: $description
      tags: $tags
      onlineAddress: $gricalUrl
      attributedToId: "6633"
      eventVisibility: "PUBLIC"
    ) {}
  }
`
