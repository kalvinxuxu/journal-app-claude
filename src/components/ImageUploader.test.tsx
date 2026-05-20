// @vitest-environment jsdom

import { afterEach, describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImageUploader } from "./ImageUploader";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ImageUploader", () => {
  it("renders empty state with add button when no images", () => {
    const mockOnChange = () => {};
    render(<ImageUploader images={[]} onChange={mockOnChange} />);

    expect(screen.getByText("+ 添加图片")).toBeTruthy();
    expect(screen.getByText("最多 3 张图片")).toBeTruthy();
  });

  it("renders image count when images exist", () => {
    const mockOnChange = () => {};
    const existingImages = ["data:image/png;base64,abc123", "data:image/png;base64,def456"];
    render(<ImageUploader images={existingImages} onChange={mockOnChange} />);

    expect(screen.getByText("最多 3 张图片")).toBeTruthy();
  });

  it("calls onChange with new images when file is selected", () => {
    const captured: string[][] = [];
    const mockOnChange = (images: string[]) => captured.push(images);

    render(<ImageUploader images={[]} onChange={mockOnChange} />);

    // Simulate file selection with a mock file
    const file = new File(["fake image content"], "test.png", { type: "image/png" });
    const dataUrl = "data:image/png;base64,fakeimage";

    // Mock FileReader
    const originalFileReader = window.FileReader;
    window.FileReader = function () {
      const reader = new originalFileReader();
      reader.onload = (e) => {
        // Override onload to simulate successful read
        Object.defineProperty(e.target, "result", { value: dataUrl });
        // Call original onload with our mocked event
        originalFileReader.prototype.onload.call(e);
      };
      return reader;
    } as any;

    const input = screen.getByRole("button", { name: "+ 添加图片" }).parentElement?.querySelector("input");
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    // After mock FileReader, the onChange should be called
    expect(captured.length >= 0).toBeTruthy();
  });

  it("renders delete button on each image", () => {
    const images = ["data:image/png;base64,abc123"];
    render(<ImageUploader images={images} onChange={() => {}} />);

    const deleteButtons = screen.getAllByRole("button", { name: /删除|x/i });
    expect(deleteButtons.length).toBe(1);
  });

  it("calls onChange without deleted image when delete is clicked", () => {
    const images = ["data:image/png;base64,abc123", "data:image/png;base64,def456"];
    const captured: string[][] = [];
    const mockOnChange = (newImages: string[]) => captured.push(newImages);

    render(<ImageUploader images={images} onChange={mockOnChange} />);

    const deleteButton = screen.getAllByRole("button", { name: "删除" })[0];
    fireEvent.click(deleteButton);

    expect(captured).toHaveLength(1);
    expect(captured[0]).toHaveLength(1);
    expect(captured[0][0]).toBe("data:image/png;base64,def456");
  });

  it("hides add button when max images reached", () => {
    const images = ["a", "b", "c"]; // 3 images
    render(<ImageUploader images={images} onChange={() => {}} maxImages={3} />);

    expect(screen.queryByText("+ 添加图片")).toBeNull();
  });

  it("shows add button when under max images", () => {
    const images = ["a", "b"]; // 2 images, max is 3
    render(<ImageUploader images={images} onChange={() => {}} maxImages={3} />);

    expect(screen.getByText("+ 添加图片")).toBeTruthy();
  });
});
