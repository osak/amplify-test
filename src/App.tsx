import React, {useEffect, useState} from 'react';
import './App.css';
import {API, Auth, graphqlOperation} from "aws-amplify";
import {GraphQLResult} from '@aws-amplify/api-graphql';
import {Blog, ModelBlogConnection} from "./API";
import {CognitoUser} from 'amazon-cognito-identity-js';
import {AmplifyAuthenticator} from "@aws-amplify/ui-react";
import { onAuthUIStateChange, AuthState } from '@aws-amplify/ui-components';

const topPageQuery = /* GraphQL */`
  query TopPage {
    listBlogs(limit: 10) {
      items {
        id
        name
        posts(limit: 10) {
          items {
            id
            title
            createdAt
            comments(limit: 10) {
              items {
                id
                content
              }
            }
          }
        }
      }
    }
  }
`;
type TopPageQueryResult = {
  listBlogs: ModelBlogConnection;
}

function App() {
  const [user, setUser] = useState(null as CognitoUser | null);
  const [showAuthenticator, setShowAuthenticator] = useState(false);
  const [blogs, setBlogs] = useState([] as Blog[]);

  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    Auth.currentAuthenticatedUser().then((result) => setUser(result));
    return onAuthUIStateChange((state) => {
      if (state == AuthState.SignedIn) {
        Auth.currentAuthenticatedUser().then((result) => setUser(result));
      } else if (state == AuthState.SignedOut) {
        setUser(null);
      }
    });
  }, []);

  async function fetchBlogs() {
    try {
      const blogData = await (API.graphql(graphqlOperation(topPageQuery)) as Promise<GraphQLResult<TopPageQueryResult>>);
      const blogs = blogData.data!!.listBlogs!!.items as Blog[];
      setBlogs(blogs);
    } catch (err) { console.error('error fetching blogs', err); }
  }

  return (
    <div className="App">
      <header>Logged in as {user?.getUsername()} <button onClick={() => setShowAuthenticator(true)}>Login</button></header>
      {showAuthenticator && <AmplifyAuthenticator />}
      <h2>Blogs</h2>
      {
        blogs.map((blog) => (
            <div key={blog.id} className="blog">
              <h3>{blog.name}</h3>
              {
                blog.posts?.items?.map((post) => post && (
                    <div className="post" key={post.id}>
                      <h4>{post.title}</h4>
                      <div className="timestamp">Posted: {post.createdAt}</div>
                      {
                        post.comments?.items?.map((comment) => comment && (
                            <div className="comment" key={comment.id}>{comment.content}</div>
                        ))
                      }
                    </div>
                ))
              }
            </div>
        ))
      }
    </div>
  );
}

export default App;
