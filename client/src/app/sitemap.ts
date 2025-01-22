import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://acme.com",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: "https://acme.com/about",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://acme.com/blog",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: "https://example.com",
      lastModified: "2021-01-01",
      changeFrequency: "weekly",
      priority: 0.5,
      videos: [
        {
          title: "example",
          thumbnail_loc: "https://example.com/image.jpg",
          description: "this is the description",
        },
      ],
    },

    {
      url: "https://acme.com",
      lastModified: new Date(),
      alternates: {
        languages: {
          es: "https://acme.com/es",
          de: "https://acme.com/de",
        },
      },
    },
    {
      url: "https://acme.com/about",
      lastModified: new Date(),
      alternates: {
        languages: {
          es: "https://acme.com/es/about",
          de: "https://acme.com/de/about",
        },
      },
    },
    {
      url: "https://acme.com/blog",
      lastModified: new Date(),
      alternates: {
        languages: {
          es: "https://acme.com/es/blog",
          de: "https://acme.com/de/blog",
        },
      },
    },
  ];
}
