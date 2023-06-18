import "./block_styles.css";
import { PlusIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import React, {
	KeyboardEvent,
	MouseEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import ContentEditable, { ContentEditableEvent } from "react-contenteditable";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../../../Button";

import { RootState } from "../../../../app/store";
import {
	StringContentBlockTypes,
	getClassNamesForTextBlocks,
	getPlaceHolderTextForTextBlocks,
	isTextTypeBlock,
	textBlockTypes,
} from "../../../../config/constants";
import {
	setCurrentFocusBlockIdx,
	setCursorPosition,
} from "../../../../features/appSlice";
import {
	addNewBlock,
	getCurrentPage,
	removeBlock,
	updateBlock,
} from "../../../../features/pagesSlice";

const ChiselStoneBlock: React.FC<{ block: Block; idx: number }> = ({
	block,
	idx,
}) => {
	const dispatch = useDispatch();
	const blockEditorRef = useRef<HTMLElement | null>(null);

	const { currentFocusBlockIdx, cursorPosition } = useSelector(
		(state: RootState) => ({
			currentFocusBlockIdx: state.app.currentFocusBlockIdx,
			cursorPosition: state.app.cursorPosition,
		})
	);

	const currentPage = useSelector(getCurrentPage);

	const currentFocusBlockIdxRef = useRef<number>(currentFocusBlockIdx);
	const currentPageRef = useRef(currentPage);
	const cursorPositionRef = useRef<number>(cursorPosition);

	const [blockText, setBlockText] = useState(() =>
		isTextTypeBlock(block) && textBlockTypes.includes(block.type)
			? block.content
			: ""
	);

	// Handle new block add
	const handleAddBlock = (e: MouseEvent<HTMLButtonElement>) => {
		const insertMode = e.altKey ? "before" : "after";
		dispatch(addNewBlock({ blockId: block.id, insertMode }));
	};

	// Add "Add functionality" for keyboard navigators
	const handleAddButtonKeyDown = (
		ev: React.KeyboardEvent<HTMLButtonElement>
	) => {
		if (ev.key === "Tab") return;

		if (ev.key === "Enter") {
			ev.preventDefault();
			if (!currentPageRef.current) return;
			const insertMode = ev.altKey ? "before" : "after";
			const step = ev.altKey ? -1 : 1;
			dispatch(addNewBlock({ blockId: block.id, insertMode }));
			dispatch(
				setCurrentFocusBlockIdx(
					Math.min(
						Math.max(0, currentFocusBlockIdxRef.current + step),
						currentPageRef.current.content.length - 1
					)
				)
			);
		}
	};

	// Update state when out of focus
	const handleOnBlur = useCallback(() => {
		const newText = blockEditorRef.current?.textContent || "";
		if (block.content !== newText)
			dispatch(updateBlock({ block, content: newText }));
	}, [dispatch, block]);

	// Handle text input
	const handleTextBlockInput = useCallback(
		(e: ContentEditableEvent) => {
			const newText = blockEditorRef.current?.textContent || "";
			setBlockText(newText);
		},
		[setBlockText]
	);

	// Handle Keydown
	const handleKeyUp = useCallback(
		(ev: KeyboardEvent<HTMLDivElement>) => {
			const selection = window.getSelection();
			if (selection && selection.rangeCount > 0) {
				const range = selection.getRangeAt(0);
				const offset = range.startOffset;
				dispatch(setCursorPosition(offset));
			}
		},
		[dispatch]
	);

	const handleKeyDown = useCallback(
		(ev: React.KeyboardEvent<HTMLDivElement>) => {
			if (!blockEditorRef.current) return;
			const blocksLength = currentPageRef.current?.content.length || 0;
			if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
				ev.preventDefault();
				const step = ev.key === "ArrowDown" ? 1 : -1;
				const nextFocusBlock = Math.min(
					Math.max(0, currentFocusBlockIdxRef.current + step),
					blocksLength - 1
				);

				dispatch(setCurrentFocusBlockIdx(nextFocusBlock));
			} else if (ev.key === "Enter" && !ev.shiftKey) {
				ev.preventDefault();

				const newText = blockEditorRef.current.textContent || "";
				const leftText = newText.substring(0, cursorPositionRef.current);
				const rightText = newText.substring(
					cursorPositionRef.current,
					newText.length
				);

				const insertMode = ev.altKey ? "before" : "after";
				const step = ev.altKey ? 0 : 1;
				setBlockText(leftText);
				dispatch(updateBlock({ block, content: leftText }));
				dispatch(
					addNewBlock({ blockId: block.id, insertMode, content: rightText })
				);

				const newFocusBlockIdx = currentFocusBlockIdxRef.current + step;
				dispatch(setCurrentFocusBlockIdx(Math.max(0, newFocusBlockIdx)));
				dispatch(
					setCursorPosition(insertMode === "before" ? 0 : rightText.length)
				);
			} else if (ev.key === "Enter" && ev.shiftKey) {
				const newText = blockEditorRef.current.textContent + "\n";
				setBlockText(newText);
			}

			// Remove the block if the block has no content and the event key is Backspace
			else if (ev.key === "Backspace") {
				const precedingBlockIdx = Math.max(
					0,
					currentFocusBlockIdxRef.current - 1
				);
				const precedingBlock =
					currentPageRef.current?.content[precedingBlockIdx];

				if (blockEditorRef.current.textContent?.length === 0) {
					ev.preventDefault();
					dispatch(removeBlock(block));
					if (!precedingBlock) return;

					dispatch(setCurrentFocusBlockIdx(precedingBlockIdx));
					dispatch(setCursorPosition(precedingBlock.content.length));
					// Todo: add history functionality
				} else {
					// ? If there is content and the cursor is at start of block then merge with the preceding block
					if (
						cursorPositionRef.current === 0 &&
						precedingBlock !== undefined &&
						currentPageRef.current &&
						currentFocusBlockIdxRef.current !== 0 &&
						isTextTypeBlock(precedingBlock)
					) {
						ev.preventDefault();
						const currentBlockContent =
							blockEditorRef.current.textContent || "";

						const mergedContent = precedingBlock.content + currentBlockContent;
						const mergedCursorPosition = precedingBlock.content.length;

						dispatch(
							updateBlock({
								block: precedingBlock,
								content: mergedContent,
							})
						);

						dispatch(removeBlock(block));
						dispatch(setCurrentFocusBlockIdx(precedingBlockIdx));
						dispatch(setCursorPosition(mergedCursorPosition));
					}
				}
			} else if (["1", "2", "3"].includes(ev.key) && ev.ctrlKey) {
				ev.preventDefault();
				const key = ev.key;
				const insertMode = ev.altKey ? "before" : "after";
				const step = ev.altKey ? 0 : 1;
				const type = "h" + key;
				console.log(type);
				dispatch(
					addNewBlock({
						blockId: block.id,
						content: "",
						insertMode,
						type: ("h" + key) as StringContentBlockTypes,
					})
				);

				dispatch(
					setCurrentFocusBlockIdx(currentFocusBlockIdxRef.current + step)
				);
			} else if (ev.key.toLowerCase() === "d" && ev.ctrlKey) {
				ev.preventDefault();
				dispatch(removeBlock(block));
			}
			// Update cursor position in state for other key events
			else {
			}
		},
		[
			dispatch,
			currentFocusBlockIdxRef,
			blockEditorRef,
			cursorPositionRef,
			currentPageRef,
			idx,
			block,
		]
	);

	const handleFocus = () => {
		// dispatch(setCurrentFocusBlockIdx(idx));
		if (blockEditorRef.current) {
			const selection = window.getSelection();
			if (selection) {
				const range = document.createRange();
				const contentLength = blockEditorRef.current.textContent?.length || 0;
				let startPosition = cursorPositionRef.current;
				const firstChildNode = blockEditorRef.current.firstChild;
				if (firstChildNode instanceof Node) {
					startPosition = Math.min(startPosition, contentLength);
					range.setStart(firstChildNode, startPosition);
				} else {
					startPosition = contentLength;
					range.setStart(blockEditorRef.current, startPosition);
				}
				range.collapse(true);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		}
	};
	const handleOnClick = useCallback(() => {
		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const offset = range.startOffset;
			dispatch(setCursorPosition(offset));
			dispatch(setCurrentFocusBlockIdx(idx));
		}
	}, [dispatch, idx]);

	useEffect(() => {
		cursorPositionRef.current = cursorPosition;
	}, [cursorPosition]);

	useEffect(() => {
		setBlockText(() =>
			isTextTypeBlock(block) && textBlockTypes.includes(block.type)
				? block.content
				: ""
		);
	}, [block]);

	// Set the currentFocusBlockIdx
	useEffect(() => {
		// Todo change this behavior and make current cursor position for each page
		const blocksLength = currentPageRef.current
			? currentPageRef.current.content.length - 1
			: 0;
		currentFocusBlockIdxRef.current = Math.min(
			Math.max(0, currentFocusBlockIdx),
			blocksLength
		);
	}, [currentFocusBlockIdx, idx]);

	useEffect(() => {
		if (!blockEditorRef.current) return;
		if (currentFocusBlockIdxRef.current === idx) blockEditorRef.current.focus();
	}, [currentFocusBlockIdx, idx]);

	useEffect(() => {
		currentPageRef.current = currentPage;
	}, [currentPage]);

	return (
		<div className="page__block" tabIndex={-1} data-block-id={block.id}>
			<div className="page__block__actions">
				<Button onClick={handleAddBlock} onKeyDown={handleAddButtonKeyDown}>
					<PlusIcon width={17} />
				</Button>
				<div className="page__block__actions-move">
					<Squares2X2Icon width={17} />
				</div>
			</div>

			{/*  For Text Block */}
			{isTextTypeBlock(block) && (
				<ContentEditable
					onFocus={handleFocus}
					onBlur={handleOnBlur}
					onKeyDown={handleKeyDown}
					onKeyUp={handleKeyUp}
					onClick={handleOnClick}
					data-placeholder={getPlaceHolderTextForTextBlocks(block.type)}
					onChange={handleTextBlockInput}
					style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
					html={blockText}
					innerRef={blockEditorRef}
					className={`page__block__editable_div ${getClassNamesForTextBlocks(
						block.type
					)} ${blockText === "" ? "empty" : ""}`}
				/>
			)}
		</div>
	);
};

export default ChiselStoneBlock;

// <ContentEditable
// 			innerRef={titleEditorRef}
// 			className={`page__title_editor ${
// 				!currentPage?.title || currentPage.title === "Untitled" ? "empty" : ""
// 			}`}
// 			html={
// 				currentPage?.title && currentPage.title.toLowerCase() !== "untitled"
// 					? currentPage.title
// 					: ""
// 			}
// 			disabled={false}
// 			onKeyDown={handleKeyDown}
// 			onChange={pageTitleHandler}
// 			tagName="div"
// 			data-placeholder="Untitled"
// 		/>
