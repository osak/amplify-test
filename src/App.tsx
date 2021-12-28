import React, {FormEvent, useEffect, useState} from 'react';
import './App.css';
import {API, Auth, graphqlOperation} from "aws-amplify";
import {GraphQLResult} from '@aws-amplify/api-graphql';
import {GRAPHQL_AUTH_MODE} from '@aws-amplify/api';
import {Blog, Comment, ModelBlogConnection, Post} from "./API";
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

const newBlogQuery = /* GraphQL */`
  mutation NewBlog($input: CreateBlogInput!) {
    createBlog(input: $input) {
      id
    }
  }
`;

const newPostQuery = /* GraphQL */`
  mutation NewPost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
    }
  }
`;

const newCommentQuery = /* GraphQL */`
  mutation NewComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
    }
  }
`

type TopPageQueryResult = {
  listBlogs: ModelBlogConnection;
}

function App() {
  const [user, setUser] = useState(null as CognitoUser | null);
  const [showAuthenticator, setShowAuthenticator] = useState(false);
  const [blogs, setBlogs] = useState([] as Blog[]);
  const [newBlogName, setNewBlogName] = useState('');

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
      const blogData = await (API.graphql({
        query: topPageQuery,
        authMode: GRAPHQL_AUTH_MODE.AWS_IAM,
      }) as Promise<GraphQLResult<TopPageQueryResult>>);
      const blogs = blogData.data!!.listBlogs!!.items as Blog[];
      setBlogs(blogs);
    } catch (err) {
      console.error('error fetching blogs', err);
    }
  }

  function onSubmit(e: FormEvent) {
    const input = {
      name: newBlogName
    };

    API.graphql({
      query: newBlogQuery,
      authMode: GRAPHQL_AUTH_MODE.AWS_IAM,
      variables: {
        input: input
      }
    });
    e.preventDefault();
    return false
  }

  return (
    <div className="App">
      <header>Logged in as {user?.getUsername()} <button onClick={() => setShowAuthenticator(true)}>Login</button></header>
      {showAuthenticator && <AmplifyAuthenticator />}
      <h2>Blogs</h2>
      {
        blogs.map((blog) => <BlogComponent key={blog.id} blog={blog} />)
      }
      <h3>Create new blog</h3>
      <form onSubmit={onSubmit}>
        <label htmlFor="name">Name: </label>
        <input type="text" value={newBlogName} onChange={(e) => setNewBlogName(e.currentTarget.value)} />
        <button>Create</button>
      </form>
    </div>
  );
}

interface BlogProps {
  blog: Blog;
}
function BlogComponent({ blog }: BlogProps) {
  const [newTitle, setNewTitle] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();

    API.graphql({
      query: newPostQuery,
      authMode: GRAPHQL_AUTH_MODE.AWS_IAM,
      variables: {
        input: {
          title: newTitle,
          blogPostsId: blog.id,
        }
      }
    });
  }

  return (
      <div className="blog">
        <h3>{blog.name}</h3>
        {
          blog.posts?.items?.map((post) => post && <PostComponent key={post.id} post={post} />)
        }
        <form className="new-post" onSubmit={onSubmit}>
          <label htmlFor="title">Title</label>
          <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.currentTarget.value)} />
          <button>Post</button>
        </form>
      </div>
  );
}

interface PostProps {
  post: Post;
}
function PostComponent({ post }: PostProps) {
  const [newComment, setNewComment] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();

    API.graphql({
      query: newCommentQuery,
      authMode: GRAPHQL_AUTH_MODE.AWS_IAM,
      variables: {
        input: {
          content: newComment,
          postCommentsId: post.id,
        }
      }
    });
  }

  return (
      <div className="post">
        <h4>{post.title}</h4>
        <div className="timestamp">Posted: {post.createdAt}</div>
        {
          post.comments?.items?.map((comment) => comment && <CommentComponent key={comment.id} comment={comment} />)
        }
        <form className="new-comment" onSubmit={onSubmit}>
          <label htmlFor="title">Comment</label>
          <input type="text" value={newComment} onChange={(e) => setNewComment(e.currentTarget.value)} />
          <button>Comment</button>
        </form>
      </div>
  );
}

interface CommentProps {
  comment: Comment;
}
function CommentComponent({ comment }: CommentProps) {
  return (
      <div className="comment">{comment.content}</div>
  )
}

export default App;
