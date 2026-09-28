insert into public.courses (title, slug, description, track, price, thumbnail_url, instructor_name, instructor_bio, is_published, is_crash_course, access_policy, access_days)
values ('Generative AI, LLMs, Agents & MCP — Practical Foundations','generative-ai-llms-agents-mcp','A beginner-friendly, hands-on introduction to modern AI — Generative AI, Large Language Models, prompt engineering, agents, RAG and the Model Context Protocol.

What you''ll learn
- Fundamentals of Generative AI and how it differs from traditional AI
- How Large Language Models work at a high level, without heavy math
- Tokens, prompts and how tokenization affects output quality and API cost
- Prompt engineering techniques for consistent, reliable results from any LLM
- How AI systems use context, memory and tools
- Retrieval-Augmented Generation: traditional vs agentic RAG, built visually in Langflow
- Building AI agents in AWS Bedrock Agent that work autonomously
- Model Context Protocol: hosts, clients, servers and transport layers
- Building your own MCP server for Google Calendar with OAuth and live API access
- Using third-party MCP servers to connect external systems
- Running and comparing open-source models locally
- Getting more from Claude: Claude Code, Claude Cowork and Claude Skills

Taught by Himanshu Rana, a Cloud Solutions Architect with 16+ years delivering enterprise-grade solutions on AWS and Azure, and a Microsoft Certified Trainer.

Who this course is for
- Beginners with no prior AI or machine learning background
- Developers and non-developers who want a visual, low-code path into RAG and agentic workflows
- Product managers, founders and team leads who need a working mental model of modern AI systems
- Anyone curious about MCP, Langflow, or connecting an AI model to a real external tool

By the end you will have a working RAG pipeline built visually in Langflow and a complete, deployed MCP server project.','AI & Machine Learning',4999,null,'Himanshu Rana','Cloud Solutions Architect with 16+ years delivering enterprise-grade solutions on AWS and Azure, and a Microsoft Certified Trainer.',true,false,'lifetime',null);

insert into public.course_modules (course_id, title, order_index)
select c.id, v.title, v.idx from public.courses c,
(values
('Getting Started: Generative AI on Your Own Machine',0),
('Fundamentals of Generative AI & LLMs',1),
('The Art of Prompt Engineering',2),
('Agentic AI Fundamentals & Development',3),
('Understanding and Implementing Agentic RAG',4),
('Model Context Protocol (MCP) Fundamentals & Projects',5),
('Claude AI Assistant',6),
('Conclusion',7)
) as v(title, idx)
where c.slug='generative-ai-llms-agents-mcp';