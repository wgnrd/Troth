import { browser } from '$app/environment';

const ALLOWED_TAGS = new Set([
	'a',
	'blockquote',
	'br',
	'code',
	'em',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'hr',
	'li',
	'ol',
	'p',
	'pre',
	'strong',
	'ul'
]);

export const formattedNotesClasses =
	'text-sm leading-6 text-foreground/85 [&_a]:text-foreground [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-stone-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_em]:italic [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-stone-100 [&_pre]:p-3 [&_strong]:font-semibold [&_ul]:space-y-1 [&_ul]:pl-5';

export function formatNotesHtml(input: string): string {
	const trimmed = input.trim();

	if (!trimmed) {
		return '';
	}

	if (!looksLikeHtml(trimmed)) {
		return markdownToHtml(trimmed);
	}

	if (!browser) {
		return plainTextToHtml(trimmed);
	}

	const template = document.createElement('template');
	template.innerHTML = trimmed;

	const fragment = document.createDocumentFragment();

	for (const node of Array.from(template.content.childNodes)) {
		const sanitized = sanitizeNode(node);
		if (sanitized) {
			fragment.appendChild(sanitized);
		}
	}

	const container = document.createElement('div');
	container.appendChild(fragment);

	return container.innerHTML || plainTextToHtml(trimmed);
}

export function notesToPlainText(input: string): string {
	const trimmed = input.trim();

	if (!trimmed) {
		return '';
	}

	if (browser) {
		const template = document.createElement('template');
		template.innerHTML = looksLikeHtml(trimmed) ? trimmed : markdownToHtml(trimmed);
		const text = template.content.textContent ?? '';
		return collapseWhitespace(text);
	}

	return collapseWhitespace(
		(looksLikeHtml(trimmed) ? trimmed.replace(/<[^>]+>/g, ' ') : stripMarkdown(trimmed)).trim()
	);
}

export function notesToEditableMarkdown(input: string): string {
	const trimmed = input.trim();

	if (!trimmed) {
		return '';
	}

	if (!looksLikeHtml(trimmed)) {
		return trimmed;
	}

	if (!browser) {
		return collapseWhitespace(trimmed.replace(/<[^>]+>/g, ' '));
	}

	const template = document.createElement('template');
	template.innerHTML = trimmed;

	return htmlNodeToMarkdown(template.content).trim();
}

function sanitizeNode(node: Node): Node | null {
	if (node.nodeType === Node.TEXT_NODE) {
		return document.createTextNode(node.textContent ?? '');
	}

	if (node.nodeType !== Node.ELEMENT_NODE) {
		return null;
	}

	const element = node as Element;
	const tagName = element.tagName.toLowerCase();

	if (!ALLOWED_TAGS.has(tagName)) {
		const fragment = document.createDocumentFragment();

		for (const child of Array.from(element.childNodes)) {
			const sanitizedChild = sanitizeNode(child);
			if (sanitizedChild) {
				fragment.appendChild(sanitizedChild);
			}
		}

		return fragment;
	}

	const clean = document.createElement(tagName);

	if (tagName === 'a') {
		const href = element.getAttribute('href') ?? '';
		if (isSafeHref(href)) {
			clean.setAttribute('href', href);
			clean.setAttribute('target', '_blank');
			clean.setAttribute('rel', 'noreferrer noopener');
		}
	}

	for (const child of Array.from(element.childNodes)) {
		const sanitizedChild = sanitizeNode(child);
		if (sanitizedChild) {
			clean.appendChild(sanitizedChild);
		}
	}

	return clean;
}

function isSafeHref(href: string) {
	if (!href) {
		return false;
	}

	return /^(https?:|mailto:|\/)/i.test(href);
}

function plainTextToHtml(input: string) {
	return escapeHtml(input)
		.split(/\n{2,}/)
		.map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
		.join('');
}

function markdownToHtml(input: string) {
	const lines = input.replace(/\r\n/g, '\n').split('\n');
	const parts: string[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index];
		const trimmed = line.trim();

		if (!trimmed) {
			index += 1;
			continue;
		}

		if (trimmed.startsWith('```')) {
			const codeLines: string[] = [];
			index += 1;

			while (index < lines.length && !lines[index].trim().startsWith('```')) {
				codeLines.push(lines[index]);
				index += 1;
			}

			if (index < lines.length) {
				index += 1;
			}

			parts.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
			continue;
		}

		const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
		if (heading) {
			const level = heading[1].length;
			parts.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
			index += 1;
			continue;
		}

		if (trimmed.startsWith('> ')) {
			const quoteLines: string[] = [];

			while (index < lines.length && lines[index].trim().startsWith('> ')) {
				quoteLines.push(lines[index].trim().slice(2));
				index += 1;
			}

			parts.push(
				`<blockquote><p>${renderInlineMarkdown(quoteLines.join('<br>'))}</p></blockquote>`
			);
			continue;
		}

		if (/^[-*+]\s+/.test(trimmed)) {
			const items: string[] = [];

			while (index < lines.length && /^[-*+]\s+/.test(lines[index].trim())) {
				items.push(
					`<li>${renderInlineMarkdown(lines[index].trim().replace(/^[-*+]\s+/, ''))}</li>`
				);
				index += 1;
			}

			parts.push(`<ul>${items.join('')}</ul>`);
			continue;
		}

		if (/^\d+\.\s+/.test(trimmed)) {
			const items: string[] = [];

			while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
				items.push(
					`<li>${renderInlineMarkdown(lines[index].trim().replace(/^\d+\.\s+/, ''))}</li>`
				);
				index += 1;
			}

			parts.push(`<ol>${items.join('')}</ol>`);
			continue;
		}

		const paragraphLines = [line];
		index += 1;

		while (index < lines.length) {
			const next = lines[index].trim();
			if (
				!next ||
				next.startsWith('```') ||
				next.startsWith('> ') ||
				/^[-*+]\s+/.test(next) ||
				/^\d+\.\s+/.test(next) ||
				/^(#{1,3})\s+/.test(next)
			) {
				break;
			}

			paragraphLines.push(lines[index]);
			index += 1;
		}

		parts.push(`<p>${renderInlineMarkdown(paragraphLines.join('<br>'))}</p>`);
	}

	return parts.join('');
}

function renderInlineMarkdown(input: string) {
	let html = escapeHtml(input);

	html = html.replace(
		/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)]+|\/[^)\s]*)\)/g,
		(_match, text, href) => {
			return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer noopener">${escapeHtml(text)}</a>`;
		}
	);
	html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
	html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	html = html.replace(/(^|[\s(])\*([^*]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');

	return html;
}

function escapeHtml(input: string) {
	return input
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function collapseWhitespace(input: string) {
	return input
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.join(' ')
		.replace(/\s+/g, ' ');
}

function looksLikeHtml(input: string) {
	return /<\/?[a-z][\s\S]*>/i.test(input);
}

function stripMarkdown(input: string) {
	return input
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^>\s?/gm, '')
		.replace(/^[-*+]\s+/gm, '')
		.replace(/^\d+\.\s+/gm, '')
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
		.replace(/[*_~`>#-]/g, ' ');
}

function htmlNodeToMarkdown(root: ParentNode): string {
	const parts: string[] = [];

	for (const child of Array.from(root.childNodes)) {
		const chunk = htmlNodeToMarkdownChunk(child);
		if (chunk) {
			parts.push(chunk);
		}
	}

	return parts.join('').replace(/\n{3,}/g, '\n\n');
}

function htmlNodeToMarkdownChunk(node: Node): string {
	if (node.nodeType === Node.TEXT_NODE) {
		return node.textContent ?? '';
	}

	if (node.nodeType !== Node.ELEMENT_NODE) {
		return '';
	}

	const element = node as HTMLElement;
	const tag = element.tagName.toLowerCase();

	switch (tag) {
		case 'br':
			return '\n';
		case 'p':
			return `${htmlNodeToMarkdown(element).trim()}\n\n`;
		case 'strong':
		case 'b':
			return `**${htmlNodeToMarkdown(element).trim()}**`;
		case 'em':
		case 'i':
			return `*${htmlNodeToMarkdown(element).trim()}*`;
		case 'code':
			return `\`${htmlNodeToMarkdown(element).trim()}\``;
		case 'pre':
			return `\`\`\`\n${element.textContent?.trim() ?? ''}\n\`\`\`\n\n`;
		case 'blockquote':
			return `${htmlNodeToMarkdown(element)
				.trim()
				.split('\n')
				.map((line) => `> ${line}`)
				.join('\n')}\n\n`;
		case 'h1':
			return `# ${htmlNodeToMarkdown(element).trim()}\n\n`;
		case 'h2':
			return `## ${htmlNodeToMarkdown(element).trim()}\n\n`;
		case 'h3':
			return `### ${htmlNodeToMarkdown(element).trim()}\n\n`;
		case 'ul':
			return `${Array.from(element.children)
				.map((child) => `- ${htmlNodeToMarkdown(child).trim()}`)
				.join('\n')}\n\n`;
		case 'ol':
			return `${Array.from(element.children)
				.map((child, index) => `${index + 1}. ${htmlNodeToMarkdown(child).trim()}`)
				.join('\n')}\n\n`;
		case 'li':
			return htmlNodeToMarkdown(element);
		case 'a': {
			const href = element.getAttribute('href');
			const text = htmlNodeToMarkdown(element).trim();
			return href ? `[${text}](${href})` : text;
		}
		default:
			return htmlNodeToMarkdown(element);
	}
}
