import fetch from 'node-fetch';

interface VideoSource {
  url: string;
  format: string;
  mimeType: string;
  width?: number;
  height?: number;
}

interface VideoFile {
  id: string;
  filename: string;
  duration?: number;
  sources: VideoSource[];
  originalSource: {
    url: string;
    format: string;
    mimeType: string;
  };
}

export class ShopifyMediaService {
  private shopifyDomain: string;
  private accessToken: string;

  constructor() {
    this.shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'gold-standard-cbd.myshopify.com';
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
  }

  async fetchVideoFiles(first: number = 50, query?: string): Promise<VideoFile[]> {
    const graphqlQuery = `
      query GetVideoFiles($first: Int!, $query: String) {
        files(first: $first, query: $query) {
          nodes {
            id
            ... on Video {
              filename
              duration
              sources {
                url
                format
                mimeType
                width
                height
              }
              originalSource {
                url
                format
                mimeType
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const variables = {
      first,
      query: query || 'media_type:video'
    };

    try {
      const response = await fetch(`https://${this.shopifyDomain}/admin/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables
        })
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        throw new Error('GraphQL query failed');
      }

      // Filter out non-video nodes and return only video files
      const videoFiles = data.data.files.nodes.filter((node: any) => node.filename);
      return videoFiles;
    } catch (error) {
      console.error('Error fetching video files:', error);
      throw error;
    }
  }

  async fetchProductVideos(productId: string): Promise<any> {
    const graphqlQuery = `
      query GetProductMedia($id: ID!) {
        product(id: $id) {
          id
          title
          media(first: 20) {
            edges {
              node {
                id
                mediaContentType
                ... on Video {
                  sources {
                    url
                    format
                    mimeType
                    width
                    height
                  }
                  originalSource {
                    url
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      id: productId
    };

    try {
      const response = await fetch(`https://${this.shopifyDomain}/admin/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables
        })
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        throw new Error('GraphQL query failed');
      }

      return data.data.product;
    } catch (error) {
      console.error('Error fetching product videos:', error);
      throw error;
    }
  }

  async fetchAllMediaFiles(first: number = 50): Promise<any[]> {
    const graphqlQuery = `
      query GetAllMedia($first: Int!) {
        files(first: $first) {
          nodes {
            id
            alt
            createdAt
            fileStatus
            ... on GenericFile {
              url
            }
            ... on MediaImage {
              image {
                url
                width
                height
              }
            }
            ... on Video {
              filename
              duration
              sources {
                url
                format
                mimeType
                width
                height
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const variables = {
      first
    };

    try {
      const response = await fetch(`https://${this.shopifyDomain}/admin/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables
        })
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        throw new Error('GraphQL query failed');
      }

      return data.data.files.nodes;
    } catch (error) {
      console.error('Error fetching media files:', error);
      throw error;
    }
  }
}

export const shopifyMediaService = new ShopifyMediaService();